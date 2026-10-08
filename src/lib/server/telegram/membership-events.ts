import "server-only";

import type { Prisma, TelegramMembership, TelegramSubjectChannel } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { callTelegramApi, TelegramApiError } from "@/lib/server/telegram/api";
import { appendTelegramAuditEvent } from "@/lib/server/telegram/audit";
import {
  resolveTelegramAccountAccess,
  resolveTelegramGuestAccess,
} from "@/lib/server/telegram/access";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { reconcileTelegramMembership } from "@/lib/server/telegram/sync";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const TELEGRAM_USER_ID = /^[1-9][0-9]{0,19}$/;
const TELEGRAM_CHAT_ID = /^-[1-9][0-9]{0,19}$/;
const TELEGRAM_UPDATE_ID = /^[0-9]{1,32}$/;

type MembershipWithChannel = TelegramMembership & { channel: TelegramSubjectChannel };
type TelegramChatMember = { status: string; is_member?: boolean };

function memberPresent(member: TelegramChatMember) {
  return ["creator", "administrator", "member"].includes(member.status) ||
    (member.status === "restricted" && member.is_member === true);
}

function nextCheck(now: Date, expiresAt: Date | null) {
  const scheduled = new Date(
    now.getTime() + getTelegramRuntimeConfig().expiryMaxDelayMinutes * 60_000,
  );
  return expiresAt && expiresAt < scheduled ? expiresAt : scheduled;
}

async function resolveMembershipAccess(
  membership: MembershipWithChannel,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return membership.principalType === "account"
    ? resolveTelegramAccountAccess({
      userId: membership.userId!,
      subjectId: membership.channel.subjectId,
    }, db)
    : resolveTelegramGuestAccess({
      codeAccessGrantId: membership.codeAccessGrantId!,
      subjectId: membership.channel.subjectId,
    }, db);
}

async function recordDeclinedJoin(input: {
  updateId: string;
  telegramUserId: string;
  channelId?: string | null;
  membershipId?: string | null;
  reason: string;
}) {
  await telegramTransaction((tx) => appendTelegramAuditEvent(tx, {
    eventType: "join_request_declined",
    actorType: "telegram",
    telegramUserId: input.telegramUserId,
    channelId: input.channelId,
    membershipId: input.membershipId,
    telegramUpdateId: input.updateId,
    idempotencyKey: "join-declined:" + input.updateId,
    metadata: { reason: input.reason },
  }));
}

export async function handleTelegramJoinRequest(input: {
  updateId: string;
  chatId: string;
  telegramUserId: string;
  inviteLink?: string | null;
}) {
  if (!TELEGRAM_UPDATE_ID.test(input.updateId) || !TELEGRAM_CHAT_ID.test(input.chatId) ||
    !TELEGRAM_USER_ID.test(input.telegramUserId)) {
    throw new TelegramAccessError("telegram_update_invalid");
  }
  const channel = await prisma.telegramSubjectChannel.findUnique({
    where: { telegramChatId: input.chatId },
  });
  const membership = channel ? await prisma.telegramMembership.findUnique({
    where: { channelId_telegramUserId: {
      channelId: channel.id,
      telegramUserId: input.telegramUserId,
    } },
    include: { channel: true },
  }) : null;
  const access = membership ? await resolveMembershipAccess(membership) : null;
  const eligible = Boolean(
    channel?.isEnabled && channel.status === "connected" && channel.botCanInviteUsers &&
    channel.botCanRestrictMembers && membership && access?.allowed &&
    !["left", "removed"].includes(membership.status),
  );

  if (!eligible) {
    await callTelegramApi("declineChatJoinRequest", {
      chat_id: input.chatId,
      user_id: input.telegramUserId,
    });
    await recordDeclinedJoin({
      updateId: input.updateId,
      telegramUserId: input.telegramUserId,
      channelId: channel?.id,
      membershipId: membership?.id,
      reason: !channel ? "channel_unknown" : !membership ? "membership_unknown" :
        !channel.isEnabled ? "channel_disabled" : "access_inactive",
    });
    return { outcome: "declined" as const };
  }

  try {
    await callTelegramApi("approveChatJoinRequest", {
      chat_id: input.chatId,
      user_id: input.telegramUserId,
    });
  } catch (error) {
    if (!(error instanceof TelegramApiError) || error.category !== "rejected") throw error;
    const current = await callTelegramApi<TelegramChatMember>("getChatMember", {
      chat_id: input.chatId,
      user_id: input.telegramUserId,
    });
    if (!memberPresent(current)) throw error;
  }

  const now = new Date();
  await telegramTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM telegram_memberships WHERE id = ${membership!.id} FOR UPDATE`;
    const current = await tx.telegramMembership.findUniqueOrThrow({
      where: { id: membership!.id },
      include: { channel: true },
    });
    const currentAccess = await resolveMembershipAccess(current, tx);
    if (!currentAccess.allowed) {
      await tx.telegramMembership.update({
        where: { id: current.id },
        data: { status: "removal_pending", nextCheckAt: now },
      });
      await appendTelegramAuditEvent(tx, {
        eventType: "join_approval_raced_revoke",
        actorType: "system",
        telegramUserId: input.telegramUserId,
        channelId: current.channelId,
        membershipId: current.id,
        telegramUpdateId: input.updateId,
        idempotencyKey: "join-raced-revoke:" + input.updateId,
        metadata: { reason: "access_inactive_after_approval" },
      });
      return;
    }
    await tx.telegramMembership.update({
      where: { id: current.id },
      data: {
        status: "active",
        joinedAt: current.joinedAt ?? now,
        leftAt: null,
        removedAt: null,
        accessExpiresAt: currentAccess.expiresAt,
        nextCheckAt: nextCheck(now, currentAccess.expiresAt),
        lastVerifiedAt: now,
        lastErrorCode: null,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "join_request_approved",
      actorType: "telegram",
      telegramUserId: input.telegramUserId,
      channelId: current.channelId,
      membershipId: current.id,
      telegramUpdateId: input.updateId,
      idempotencyKey: "join-approved:" + input.updateId,
      metadata: { principalType: current.principalType },
    });
  });

  if (input.inviteLink) {
    try {
      await callTelegramApi("revokeChatInviteLink", {
        chat_id: input.chatId,
        invite_link: input.inviteLink,
      });
    } catch {
      // The expected Telegram ID remains the authorization boundary even if link revocation fails.
    }
  }
  const latest = await prisma.telegramMembership.findUnique({ where: { id: membership!.id } });
  if (latest?.status === "removal_pending") {
    await reconcileTelegramMembership(latest.id, "join-race:" + input.updateId);
    return { outcome: "removed_after_race" as const };
  }
  return { outcome: "approved" as const, membershipId: membership!.id };
}

export async function handleTelegramMemberUpdate(input: {
  updateId: string;
  chatId: string;
  telegramUserId: string;
  memberStatus: string;
  isMember?: boolean;
}) {
  if (!TELEGRAM_UPDATE_ID.test(input.updateId) || !TELEGRAM_CHAT_ID.test(input.chatId) ||
    !TELEGRAM_USER_ID.test(input.telegramUserId)) {
    throw new TelegramAccessError("telegram_update_invalid");
  }
  const channel = await prisma.telegramSubjectChannel.findUnique({
    where: { telegramChatId: input.chatId },
  });
  if (!channel) return { outcome: "ignored" as const };
  const membership = await prisma.telegramMembership.findUnique({
    where: { channelId_telegramUserId: {
      channelId: channel.id,
      telegramUserId: input.telegramUserId,
    } },
    include: { channel: true },
  });
  if (!membership) return { outcome: "ignored" as const };

  const present = memberPresent({ status: input.memberStatus, is_member: input.isMember });
  if (!present) {
    const now = new Date();
    await telegramTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM telegram_memberships WHERE id = ${membership.id} FOR UPDATE`;
      const current = await tx.telegramMembership.findUniqueOrThrow({ where: { id: membership.id } });
      const removed = current.status === "removal_pending" || current.status === "removed";
      await tx.telegramMembership.update({
        where: { id: current.id },
        data: removed
          ? { status: "removed", removedAt: current.removedAt ?? now, nextCheckAt: null }
          : { status: "left", leftAt: now, nextCheckAt: null },
      });
      await appendTelegramAuditEvent(tx, {
        eventType: removed ? "membership_removal_confirmed" : "membership_left",
        actorType: "telegram",
        telegramUserId: input.telegramUserId,
        channelId: channel.id,
        membershipId: current.id,
        telegramUpdateId: input.updateId,
        idempotencyKey: (removed ? "removal-confirmed:" : "membership-left:") + input.updateId,
        metadata: { telegramStatus: input.memberStatus },
      });
    });
    return { outcome: "not_present" as const };
  }

  const joiningWhileUnavailable = membership.status !== "active" && (
    !channel.isEnabled || channel.status !== "connected" || !channel.botCanRestrictMembers
  );
  if (joiningWhileUnavailable) {
    await callTelegramApi("banChatMember", {
      chat_id: input.chatId,
      user_id: input.telegramUserId,
      revoke_messages: false,
    });
    await callTelegramApi("unbanChatMember", {
      chat_id: input.chatId,
      user_id: input.telegramUserId,
      only_if_banned: true,
    });
    const now = new Date();
    await telegramTransaction(async (tx) => {
      await tx.telegramMembership.update({
        where: { id: membership.id },
        data: { status: "removed", removedAt: now, nextCheckAt: null },
      });
      await appendTelegramAuditEvent(tx, {
        eventType: "member_removed_channel_unavailable",
        actorType: "telegram",
        telegramUserId: input.telegramUserId,
        channelId: channel.id,
        membershipId: membership.id,
        telegramUpdateId: input.updateId,
        idempotencyKey: "member-channel-disabled:" + input.updateId,
        metadata: { channelStatus: channel.status, channelEnabled: channel.isEnabled },
      });
    });
    return { outcome: "removed_channel_unavailable" as const };
  }

  const access = await resolveMembershipAccess(membership);
  if (!access.allowed) {
    await reconcileTelegramMembership(membership.id, "member-update:" + input.updateId);
    return { outcome: "removed_without_access" as const };
  }
  const now = new Date();
  await telegramTransaction(async (tx) => {
    await tx.telegramMembership.update({
      where: { id: membership.id },
      data: {
        status: "active",
        joinedAt: membership.joinedAt ?? now,
        leftAt: null,
        removedAt: null,
        accessExpiresAt: access.expiresAt,
        nextCheckAt: nextCheck(now, access.expiresAt),
        lastVerifiedAt: now,
        lastErrorCode: null,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "membership_verified",
      actorType: "telegram",
      telegramUserId: input.telegramUserId,
      channelId: channel.id,
      membershipId: membership.id,
      telegramUpdateId: input.updateId,
      idempotencyKey: "member-update:" + input.updateId,
      metadata: { telegramStatus: input.memberStatus },
    });
  });
  return { outcome: "active" as const };
}
import "server-only";

import type { TelegramMembership } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { callTelegramApi, TelegramApiError } from "@/lib/server/telegram/api";
import { appendTelegramAuditEvent } from "@/lib/server/telegram/audit";
import {
  resolveTelegramAccountAccess,
  resolveTelegramGuestAccess,
} from "@/lib/server/telegram/access";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const JOIN_LINK_TTL_SECONDS = 10 * 60;
const MAX_BATCH = 100;

type MembershipWithChannel = TelegramMembership & {
  channel: {
    id: string;
    subjectId: string;
    telegramChatId: string;
    isEnabled: boolean;
    status: "connected" | "degraded" | "disconnected";
    botCanInviteUsers: boolean;
    botCanRestrictMembers: boolean;
  };
};

type TelegramChatMember = {
  status: string;
  is_member?: boolean;
  user?: { id?: number };
};

type TelegramInviteLink = { invite_link: string };

function checkAt(now: Date, expiresAt: Date | null) {
  const candidate = new Date(
    now.getTime() + getTelegramRuntimeConfig().expiryMaxDelayMinutes * 60_000,
  );
  return expiresAt && expiresAt < candidate ? expiresAt : candidate;
}

function retryAt(now: Date, error: unknown) {
  const configured = getTelegramRuntimeConfig().expiryMaxDelayMinutes * 60;
  const upstream = error instanceof TelegramApiError && error.retryAfter
    ? error.retryAfter
    : 60;
  return new Date(now.getTime() + Math.max(15, Math.min(configured, upstream)) * 1000);
}

function apiErrorCode(error: unknown) {
  return error instanceof TelegramApiError
    ? "telegram_api_" + error.category
    : error instanceof TelegramAccessError
      ? error.code
      : "telegram_sync_failed";
}

function telegramMemberPresent(member: TelegramChatMember) {
  return ["creator", "administrator", "member"].includes(member.status) ||
    (member.status === "restricted" && member.is_member === true);
}

async function membershipAccess(membership: MembershipWithChannel) {
  return membership.principalType === "account"
    ? resolveTelegramAccountAccess({
      userId: membership.userId!,
      subjectId: membership.channel.subjectId,
    })
    : resolveTelegramGuestAccess({
      codeAccessGrantId: membership.codeAccessGrantId!,
      subjectId: membership.channel.subjectId,
    });
}

async function markFailure(
  membership: MembershipWithChannel,
  error: unknown,
  operationKey: string,
  removing: boolean,
) {
  const now = new Date();
  const lastErrorCode = apiErrorCode(error).slice(0, 100);
  await telegramTransaction(async (tx) => {
    await tx.telegramMembership.update({
      where: { id: membership.id },
      data: {
        status: removing ? "removal_pending" : "error",
        lastErrorCode,
        nextCheckAt: retryAt(now, error),
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "membership_sync_failed",
      actorType: "system",
      channelId: membership.channelId,
      membershipId: membership.id,
      idempotencyKey: ("sync-failed:" + operationKey).slice(0, 100),
      metadata: { errorCode: lastErrorCode, removing },
    });
  });
}

async function removeTelegramMember(
  membership: MembershipWithChannel,
  operationKey: string,
) {
  try {
    await callTelegramApi("banChatMember", {
      chat_id: membership.channel.telegramChatId,
      user_id: membership.telegramUserId,
      revoke_messages: false,
    });
    await callTelegramApi("unbanChatMember", {
      chat_id: membership.channel.telegramChatId,
      user_id: membership.telegramUserId,
      only_if_banned: true,
    });
  } catch (error) {
    await markFailure(membership, error, operationKey, true);
    throw error;
  }
  const now = new Date();
  await telegramTransaction(async (tx) => {
    await tx.telegramMembership.update({
      where: { id: membership.id },
      data: {
        status: "removed",
        removedAt: now,
        nextCheckAt: null,
        lastErrorCode: null,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "membership_removed",
      actorType: "system",
      channelId: membership.channelId,
      membershipId: membership.id,
      idempotencyKey: ("membership-removed:" + operationKey).slice(0, 100),
      metadata: { reason: "access_inactive" },
    });
  });
}

async function sendJoinRequestLink(
  membership: MembershipWithChannel,
  accessExpiresAt: Date | null,
  operationKey: string,
) {
  try {
    const invite = await callTelegramApi<TelegramInviteLink>("createChatInviteLink", {
      chat_id: membership.channel.telegramChatId,
      name: "Mustawak-" + membership.id.slice(0, 8),
      expire_date: Math.floor(Date.now() / 1000) + JOIN_LINK_TTL_SECONDS,
      creates_join_request: true,
    });
    await callTelegramApi("sendMessage", {
      chat_id: membership.telegramUserId,
      text: "تم التحقق من وصولك. استخدم الزر لإرسال طلب الانضمام إلى قناة المادة.",
      reply_markup: {
        inline_keyboard: [[{ text: "طلب الانضمام", url: invite.invite_link }]],
      },
    });
  } catch (error) {
    await markFailure(membership, error, operationKey, false);
    throw error;
  }
  await telegramTransaction(async (tx) => {
    await tx.telegramMembership.update({
      where: { id: membership.id },
      data: {
        status: "pending_join",
        accessExpiresAt,
        nextCheckAt: null,
        lastErrorCode: null,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "join_request_link_sent",
      actorType: "system",
      telegramUserId: membership.telegramUserId,
      channelId: membership.channelId,
      membershipId: membership.id,
      idempotencyKey: ("join-link-sent:" + operationKey).slice(0, 100),
      metadata: { expiresInSeconds: JOIN_LINK_TTL_SECONDS },
    });
  });
}

async function getMembershipState(membership: MembershipWithChannel) {
  return callTelegramApi<TelegramChatMember>("getChatMember", {
    chat_id: membership.channel.telegramChatId,
    user_id: membership.telegramUserId,
  });
}

export async function reconcileTelegramMembership(
  membershipId: string,
  operationKey: string,
) {
  const membership = await prisma.telegramMembership.findUnique({
    where: { id: membershipId },
    include: { channel: { select: {
      id: true,
      subjectId: true,
      telegramChatId: true,
      isEnabled: true,
      status: true,
      botCanInviteUsers: true,
      botCanRestrictMembers: true,
    } } },
  }) as MembershipWithChannel | null;
  if (!membership) return { outcome: "missing" as const };

  const access = await membershipAccess(membership);
  if (!access.allowed) {
    if (membership.status === "removed") return { outcome: "already_removed" as const };
    await removeTelegramMember(membership, operationKey);
    return { outcome: "removed" as const };
  }

  const now = new Date();
  if (membership.status === "active") {
    await prisma.telegramMembership.update({
      where: { id: membership.id },
      data: {
        accessExpiresAt: access.expiresAt,
        nextCheckAt: checkAt(now, access.expiresAt),
        lastErrorCode: null,
      },
    });
    return { outcome: "active" as const };
  }
  if (membership.status === "pending_join" && membership.nextCheckAt === null) {
    return { outcome: "awaiting_join_request" as const };
  }
  if (["left", "removed"].includes(membership.status)) {
    await prisma.telegramMembership.update({
      where: { id: membership.id },
      data: { accessExpiresAt: access.expiresAt, nextCheckAt: null },
    });
    return { outcome: "awaiting_explicit_relink" as const };
  }
  if (!membership.channel.isEnabled) {
    await prisma.telegramMembership.update({
      where: { id: membership.id },
      data: { status: "error", lastErrorCode: "telegram_channel_disabled", nextCheckAt: null },
    });
    return { outcome: "channel_disabled" as const };
  }
  if (membership.channel.status !== "connected" || !membership.channel.botCanInviteUsers ||
    !membership.channel.botCanRestrictMembers) {
    const error = new TelegramAccessError("telegram_channel_unavailable", 409);
    await markFailure(membership, error, operationKey, false);
    throw error;
  }

  if (membership.status === "removal_pending") {
    try {
      const current = await getMembershipState(membership);
      if (telegramMemberPresent(current)) {
        await prisma.telegramMembership.update({
          where: { id: membership.id },
          data: {
            status: "active",
            accessExpiresAt: access.expiresAt,
            nextCheckAt: checkAt(now, access.expiresAt),
            lastErrorCode: null,
          },
        });
        return { outcome: "active" as const };
      }
      await prisma.telegramMembership.update({
        where: { id: membership.id },
        data: { status: "removed", removedAt: now, nextCheckAt: null, lastErrorCode: null },
      });
      return { outcome: "awaiting_explicit_relink" as const };
    } catch (error) {
      await markFailure(membership, error, operationKey, false);
      throw error;
    }
  }

  try {
    const current = await getMembershipState(membership);
    if (telegramMemberPresent(current)) {
      await telegramTransaction(async (tx) => {
        await tx.telegramMembership.update({
          where: { id: membership.id },
          data: {
            status: "active",
            joinedAt: membership.joinedAt ?? now,
            accessExpiresAt: access.expiresAt,
            nextCheckAt: checkAt(now, access.expiresAt),
            lastErrorCode: null,
          },
        });
        await appendTelegramAuditEvent(tx, {
          eventType: "membership_verified",
          actorType: "system",
          telegramUserId: membership.telegramUserId,
          channelId: membership.channelId,
          membershipId: membership.id,
          idempotencyKey: ("membership-verified:" + operationKey).slice(0, 100),
          metadata: { status: current.status },
        });
      });
      return { outcome: "active" as const };
    }
  } catch (error) {
    if (!(error instanceof TelegramApiError) || error.category !== "rejected") {
      await markFailure(membership, error, operationKey, false);
      throw error;
    }
  }

  await sendJoinRequestLink(membership, access.expiresAt, operationKey);
  return { outcome: "join_link_sent" as const };
}

async function claimSyncJob() {
  return telegramTransaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM telegram_sync_jobs
      WHERE (status IN ('pending', 'failed') AND "availableAt" <= clock_timestamp())
         OR (status = 'processing' AND "lockedAt" <= clock_timestamp() - interval '2 minutes')
      ORDER BY "availableAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    `;
    if (!rows[0]) return null;
    const job = await tx.telegramSyncJob.findUniqueOrThrow({ where: { id: rows[0].id } });
    return tx.telegramSyncJob.update({
      where: { id: job.id },
      data: {
        status: "processing",
        attempts: { increment: 1 },
        lockedAt: new Date(),
        completedAt: null,
        lastErrorCode: null,
      },
    });
  });
}

export async function processTelegramSyncJobs(limit = 25) {
  const bounded = Math.max(1, Math.min(MAX_BATCH, Math.trunc(limit)));
  let processed = 0;
  let failed = 0;
  for (let index = 0; index < bounded; index += 1) {
    const job = await claimSyncJob();
    if (!job) break;
    try {
      if (job.type !== "reconcile_membership" || !job.membershipId) {
        throw new TelegramAccessError("telegram_sync_job_unsupported", 409);
      }
      await reconcileTelegramMembership(job.membershipId, "job:" + job.id + ":" + job.attempts);
      await prisma.telegramSyncJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date(), lastErrorCode: null },
      });
      processed += 1;
    } catch (error) {
      await prisma.telegramSyncJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          availableAt: retryAt(new Date(), error),
          completedAt: null,
          lastErrorCode: apiErrorCode(error).slice(0, 100),
        },
      });
      failed += 1;
    }
  }
  return { processed, failed };
}

async function claimDueMemberships(limit: number) {
  return telegramTransaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM telegram_memberships
      WHERE "nextCheckAt" IS NOT NULL AND "nextCheckAt" <= clock_timestamp()
        AND status IN ('active', 'pending_join', 'error', 'removal_pending')
      ORDER BY "nextCheckAt" ASC, id ASC
      FOR UPDATE SKIP LOCKED LIMIT ${limit}
    `;
    const lease = new Date(Date.now() + getTelegramRuntimeConfig().expiryMaxDelayMinutes * 60_000);
    if (rows.length) {
      await tx.telegramMembership.updateMany({
        where: { id: { in: rows.map((row) => row.id) } },
        data: { nextCheckAt: lease },
      });
    }
    return rows.map((row) => row.id);
  });
}

export async function sweepDueTelegramMemberships(limit = 50) {
  const bounded = Math.max(1, Math.min(MAX_BATCH, Math.trunc(limit)));
  const ids = await claimDueMemberships(bounded);
  let processed = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await reconcileTelegramMembership(id, "sweep:" + id + ":" + Date.now());
      processed += 1;
    } catch {
      failed += 1;
    }
  }
  return { claimed: ids.length, processed, failed };
}

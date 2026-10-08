import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { callTelegramApi } from "@/lib/server/telegram/api";
import { appendTelegramAuditEvent, enqueueTelegramSyncJob } from "@/lib/server/telegram/audit";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { telegramBotId } from "@/lib/server/telegram/security";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{8,100}$/;

type AdminActor = { id: string; sessionVersion: number };
type TelegramChat = { id: number; type: string; title?: string; username?: string };
type TelegramBotMember = {
  status: string;
  user?: { id?: number };
  can_invite_users?: boolean;
  can_restrict_members?: boolean;
};

function validateMutation(input: {
  id: string;
  idempotencyKey: string;
  reason: string;
  expectedUpdatedAt?: string;
}) {
  if (!UUID.test(input.id) || !IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    throw new TelegramAccessError("telegram_invalid_payload");
  }
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 1000) {
    throw new TelegramAccessError("telegram_reason_required");
  }
  if (input.expectedUpdatedAt && Number.isNaN(Date.parse(input.expectedUpdatedAt))) {
    throw new TelegramAccessError("telegram_invalid_payload");
  }
  return reason;
}

async function recheckAdmin(tx: Prisma.TransactionClient, actor: AdminActor) {
  const user = await tx.user.findUnique({
    where: { id: actor.id },
    select: { role: true, isActive: true, sessionVersion: true },
  });
  if (!user?.isActive || user.role !== "admin" || user.sessionVersion !== actor.sessionVersion) {
    throw new TelegramAccessError("telegram_admin_forbidden", 403);
  }
}

function assertFresh(updatedAt: Date, expected?: string) {
  if (expected && updatedAt.getTime() !== new Date(expected).getTime()) {
    throw new TelegramAccessError("telegram_target_changed", 409);
  }
}

async function replay(
  tx: Prisma.TransactionClient,
  idempotencyKey: string,
  eventType: string,
  target: { channelId?: string; membershipId?: string },
) {
  const event = await tx.telegramAuditEvent.findUnique({ where: { idempotencyKey } });
  if (!event) return false;
  if (event.eventType !== eventType ||
    (target.channelId && event.channelId !== target.channelId) ||
    (target.membershipId && event.membershipId !== target.membershipId)) {
    throw new TelegramAccessError("telegram_idempotency_conflict", 409);
  }
  return true;
}

export async function setTelegramChannelEnabled(input: {
  channelId: string;
  enabled: boolean;
  expectedUpdatedAt: string;
  idempotencyKey: string;
  reason: string;
  actor: AdminActor;
}) {
  const reason = validateMutation({
    id: input.channelId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });
  return telegramTransaction(async (tx) => {
    await recheckAdmin(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE id = ${input.channelId} FOR UPDATE`;
    const channel = await tx.telegramSubjectChannel.findUnique({ where: { id: input.channelId } });
    if (!channel) throw new TelegramAccessError("telegram_channel_not_found", 404);
    const eventType = input.enabled ? "channel_enabled" : "channel_disabled";
    if (await replay(tx, input.idempotencyKey, eventType, { channelId: channel.id })) {
      return { channel, replayed: true };
    }
    assertFresh(channel.updatedAt, input.expectedUpdatedAt);
    if (input.enabled && (channel.status !== "connected" || !channel.botCanInviteUsers ||
      !channel.botCanRestrictMembers)) {
      throw new TelegramAccessError("telegram_channel_unhealthy", 409);
    }
    const updated = channel.isEnabled === input.enabled ? channel : await tx.telegramSubjectChannel.update({
      where: { id: channel.id },
      data: { isEnabled: input.enabled },
    });
    await appendTelegramAuditEvent(tx, {
      eventType,
      actorType: "admin",
      actorUserId: input.actor.id,
      channelId: channel.id,
      idempotencyKey: input.idempotencyKey,
      metadata: { reason, enabled: input.enabled },
    });
    return { channel: updated, replayed: false };
  });
}

export async function verifyTelegramChannelHealth(input: {
  channelId: string;
  idempotencyKey: string;
  actor: AdminActor;
}) {
  if (!UUID.test(input.channelId) || !IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    throw new TelegramAccessError("telegram_invalid_payload");
  }
  const before = await prisma.telegramSubjectChannel.findUnique({ where: { id: input.channelId } });
  if (!before) throw new TelegramAccessError("telegram_channel_not_found", 404);
  const actor = await prisma.user.findUnique({
    where: { id: input.actor.id },
    select: { role: true, isActive: true, sessionVersion: true },
  });
  if (!actor?.isActive || actor.role !== "admin" || actor.sessionVersion !== input.actor.sessionVersion) {
    throw new TelegramAccessError("telegram_admin_forbidden", 403);
  }
  const config = getTelegramRuntimeConfig();
  const expectedBotId = config.botToken ? telegramBotId(config.botToken) : null;
  if (!config.enabled || !expectedBotId) throw new TelegramAccessError("telegram_unavailable", 503);

  const [chat, member] = await Promise.all([
    callTelegramApi<TelegramChat>("getChat", { chat_id: before.telegramChatId }),
    callTelegramApi<TelegramBotMember>("getChatMember", {
      chat_id: before.telegramChatId,
      user_id: expectedBotId,
    }),
  ]);
  const privateChannel = chat.type === "channel" && !chat.username;
  const connected = privateChannel && member.status === "administrator" &&
    member.can_invite_users === true && member.can_restrict_members === true;
  const now = new Date();

  return telegramTransaction(async (tx) => {
    await recheckAdmin(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE id = ${input.channelId} FOR UPDATE`;
    const current = await tx.telegramSubjectChannel.findUniqueOrThrow({ where: { id: input.channelId } });
    if (current.telegramChatId !== before.telegramChatId) {
      throw new TelegramAccessError("telegram_target_changed", 409);
    }
    if (await replay(tx, input.idempotencyKey, "channel_health_verified", { channelId: current.id })) {
      return { channel: current, replayed: true };
    }
    const updated = await tx.telegramSubjectChannel.update({
      where: { id: current.id },
      data: {
        title: (chat.title?.trim() || current.title).slice(0, 255),
        status: connected ? "connected" : "degraded",
        botCanInviteUsers: member.can_invite_users === true,
        botCanRestrictMembers: member.can_restrict_members === true,
        verifiedAt: connected ? now : current.verifiedAt,
        lastHealthCheckedAt: now,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "channel_health_verified",
      actorType: "admin",
      actorUserId: input.actor.id,
      channelId: current.id,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        status: updated.status,
        privateChannel,
        canInviteUsers: updated.botCanInviteUsers,
        canRestrictMembers: updated.botCanRestrictMembers,
      },
    });
    return { channel: updated, replayed: false };
  });
}

export async function queueTelegramMembershipRetry(input: {
  membershipId: string;
  idempotencyKey: string;
  reason: string;
  actor: AdminActor;
}) {
  const reason = validateMutation({
    id: input.membershipId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
  });
  return telegramTransaction(async (tx) => {
    await recheckAdmin(tx, input.actor);
    const membership = await tx.telegramMembership.findUnique({ where: { id: input.membershipId } });
    if (!membership) throw new TelegramAccessError("telegram_membership_not_found", 404);
    const eventKey = "retry:" + input.idempotencyKey;
    if (await replay(tx, eventKey, "membership_retry_requested", {
      channelId: membership.channelId,
      membershipId: membership.id,
    })) return { alreadyQueued: true };
    const queued = await enqueueTelegramSyncJob(tx, {
      type: "reconcile_membership",
      channelId: membership.channelId,
      membershipId: membership.id,
      dedupeKey: "admin-retry:" + input.idempotencyKey,
      actorType: "admin",
      actorUserId: input.actor.id,
      auditIdempotencyKey: "retry-job:" + input.idempotencyKey,
      metadata: { reason: "admin_retry" },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "membership_retry_requested",
      actorType: "admin",
      actorUserId: input.actor.id,
      channelId: membership.channelId,
      membershipId: membership.id,
      idempotencyKey: eventKey,
      metadata: { reason },
    });
    return { alreadyQueued: queued.alreadyQueued };
  });
}

export async function queueTelegramMassRemoval(input: {
  channelId: string;
  expectedUpdatedAt: string;
  idempotencyKey: string;
  reason: string;
  actor: AdminActor;
}) {
  const reason = validateMutation({
    id: input.channelId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });
  return telegramTransaction(async (tx) => {
    await recheckAdmin(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE id = ${input.channelId} FOR UPDATE`;
    const channel = await tx.telegramSubjectChannel.findUnique({ where: { id: input.channelId } });
    if (!channel) throw new TelegramAccessError("telegram_channel_not_found", 404);
    if (await replay(tx, input.idempotencyKey, "mass_removal_queued", { channelId: channel.id })) {
      return { queued: 0, replayed: true };
    }
    assertFresh(channel.updatedAt, input.expectedUpdatedAt);
    if (channel.isEnabled) throw new TelegramAccessError("telegram_disable_channel_first", 409);
    const memberships = await tx.telegramMembership.findMany({
      where: {
        channelId: channel.id,
        status: { in: ["active", "pending_join", "error", "removal_pending"] },
      },
      select: { id: true },
    });
    const now = new Date();
    if (memberships.length) {
      await tx.telegramMembership.updateMany({
        where: { id: { in: memberships.map((item) => item.id) } },
        data: { status: "removal_pending", nextCheckAt: now },
      });
      await tx.telegramSyncJob.createMany({
        data: memberships.map((membership) => ({
          type: "reconcile_membership" as const,
          channelId: channel.id,
          membershipId: membership.id,
          dedupeKey: `mass-remove:${input.idempotencyKey}:${membership.id}`,
          availableAt: now,
        })),
        skipDuplicates: true,
      });
    }
    await appendTelegramAuditEvent(tx, {
      eventType: "mass_removal_queued",
      actorType: "admin",
      actorUserId: input.actor.id,
      channelId: channel.id,
      idempotencyKey: input.idempotencyKey,
      metadata: { reason, membershipCount: memberships.length },
    });
    return { queued: memberships.length, replayed: false };
  });
}

export async function disconnectTelegramChannel(input: {
  channelId: string;
  expectedUpdatedAt: string;
  idempotencyKey: string;
  reason: string;
  actor: AdminActor;
}) {
  const reason = validateMutation({
    id: input.channelId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    expectedUpdatedAt: input.expectedUpdatedAt,
  });
  const channel = await telegramTransaction(async (tx) => {
    await recheckAdmin(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE id = ${input.channelId} FOR UPDATE`;
    const current = await tx.telegramSubjectChannel.findUnique({ where: { id: input.channelId } });
    if (!current) throw new TelegramAccessError("telegram_channel_not_found", 404);
    if (await replay(tx, input.idempotencyKey, "channel_disconnected", { channelId: current.id })) {
      return { channel: current, replayed: true };
    }
    assertFresh(current.updatedAt, input.expectedUpdatedAt);
    if (current.isEnabled) throw new TelegramAccessError("telegram_disable_channel_first", 409);
    const [memberships, jobs] = await Promise.all([
      tx.telegramMembership.count({
        where: { channelId: current.id, status: { notIn: ["left", "removed"] } },
      }),
      tx.telegramSyncJob.count({
        where: { channelId: current.id, status: { in: ["pending", "processing", "failed"] } },
      }),
    ]);
    if (memberships > 0) throw new TelegramAccessError("telegram_memberships_must_be_removed", 409);
    if (jobs > 0) throw new TelegramAccessError("telegram_jobs_must_be_settled", 409);
    return { channel: current, replayed: false };
  });

  if (channel.replayed) return channel;
  await callTelegramApi("leaveChat", { chat_id: channel.channel.telegramChatId });
  return telegramTransaction(async (tx) => {
    await recheckAdmin(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE id = ${input.channelId} FOR UPDATE`;
    const current = await tx.telegramSubjectChannel.findUniqueOrThrow({ where: { id: input.channelId } });
    if (await replay(tx, input.idempotencyKey, "channel_disconnected", { channelId: current.id })) {
      return { channel: current, replayed: true };
    }
    const updated = await tx.telegramSubjectChannel.update({
      where: { id: current.id },
      data: {
        status: "disconnected",
        isEnabled: false,
        botCanInviteUsers: false,
        botCanRestrictMembers: false,
        lastHealthCheckedAt: new Date(),
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "channel_disconnected",
      actorType: "admin",
      actorUserId: input.actor.id,
      channelId: current.id,
      idempotencyKey: input.idempotencyKey,
      metadata: { reason },
    });
    return { channel: updated, replayed: false };
  });
}

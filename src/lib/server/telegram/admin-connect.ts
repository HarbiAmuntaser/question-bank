import "server-only";

import type { Prisma } from "@prisma/client";

import { appendTelegramAuditEvent } from "@/lib/server/telegram/audit";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { telegramBotId } from "@/lib/server/telegram/security";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const CHAT_ID = /^-[1-9][0-9]{0,19}$/;
const USER_ID = /^[1-9][0-9]{0,19}$/;

async function databaseNow(tx: Prisma.TransactionClient) {
  const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return clock.now;
}

export type TelegramBotMembershipUpdate = {
  updateId: string;
  actorTelegramUserId: string;
  chatId: string;
  chatType: string;
  chatTitle: string;
  chatUsername: string | null;
  memberUserId: string;
  memberStatus: string;
  canInviteUsers: boolean;
  canRestrictMembers: boolean;
};

function connectionState(input: TelegramBotMembershipUpdate) {
  const privateChannel = input.chatType === "channel" && !input.chatUsername;
  const administrator = input.memberStatus === "administrator";
  const connected = privateChannel && administrator && input.canInviteUsers && input.canRestrictMembers;
  const disconnected = ["left", "kicked"].includes(input.memberStatus);
  return {
    privateChannel,
    connected,
    status: disconnected ? "disconnected" as const : connected ? "connected" as const : "degraded" as const,
  };
}

async function claimedConnectTokens(
  tx: Prisma.TransactionClient,
  telegramUserId: string,
  now: Date,
) {
  return tx.telegramLinkToken.findMany({
    where: {
      purpose: "admin_connect",
      state: "claimed",
      telegramUserId,
      expiresAt: { gt: now },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 2,
  });
}

async function assertRebindReady(tx: Prisma.TransactionClient, channelId: string) {
  const [memberships, jobs] = await Promise.all([
    tx.telegramMembership.count({
      where: { channelId, status: { notIn: ["left", "removed"] } },
    }),
    tx.telegramSyncJob.count({
      where: { channelId, status: { in: ["pending", "processing", "failed"] } },
    }),
  ]);
  if (memberships > 0) throw new TelegramAccessError("telegram_memberships_must_be_removed", 409);
  if (jobs > 0) throw new TelegramAccessError("telegram_jobs_must_be_settled", 409);
}

export async function applyTelegramBotMembershipUpdate(input: TelegramBotMembershipUpdate) {
  if (!/^[0-9]{1,32}$/.test(input.updateId) || !USER_ID.test(input.actorTelegramUserId) ||
    !CHAT_ID.test(input.chatId) || input.chatTitle.trim().length < 1 || input.chatTitle.trim().length > 255) {
    throw new TelegramAccessError("telegram_update_invalid");
  }
  const config = getTelegramRuntimeConfig();
  const expectedBotId = config.botToken ? telegramBotId(config.botToken) : null;
  if (!config.enabled || !expectedBotId || input.memberUserId !== expectedBotId) {
    throw new TelegramAccessError("telegram_update_invalid", 403);
  }

  return telegramTransaction(async (tx) => {
    const now = await databaseNow(tx);
    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE "telegramChatId" = ${input.chatId} FOR UPDATE`;
    const existing = await tx.telegramSubjectChannel.findUnique({
      where: { telegramChatId: input.chatId },
    });
    const state = connectionState(input);

    if (existing) {
      const tokens = existing.status === "disconnected" && state.connected
        ? await claimedConnectTokens(tx, input.actorTelegramUserId, now)
        : [];
      if (tokens.length > 1) throw new TelegramAccessError("telegram_admin_connect_ambiguous", 409);
      const reconnectToken = tokens[0]?.subjectId === existing.subjectId ? tokens[0] : null;
      if (existing.status === "disconnected" && state.status !== "disconnected" && !reconnectToken) {
        return { outcome: "ignored" as const, channel: existing };
      }
      const channel = await tx.telegramSubjectChannel.update({
        where: { id: existing.id },
        data: {
          title: input.chatTitle.trim(),
          status: state.status,
          botCanInviteUsers: input.canInviteUsers,
          botCanRestrictMembers: input.canRestrictMembers,
          verifiedAt: state.connected ? now : existing.verifiedAt,
          lastHealthCheckedAt: now,
        },
      });
      if (reconnectToken) {
        await tx.telegramLinkToken.update({
          where: { id: reconnectToken.id },
          data: { state: "consumed", activeKey: null, consumedAt: now },
        });
      }
      await appendTelegramAuditEvent(tx, {
        eventType: reconnectToken ? "channel_reconnected" : "channel_health_changed",
        actorType: reconnectToken ? "admin" : "telegram",
        actorUserId: reconnectToken?.userId,
        telegramUserId: input.actorTelegramUserId,
        channelId: channel.id,
        linkTokenId: reconnectToken?.id,
        telegramUpdateId: input.updateId,
        idempotencyKey: (reconnectToken ? "channel-reconnected:" : "channel-health:") + input.updateId,
        metadata: {
          status: channel.status,
          enabled: channel.isEnabled,
          canInviteUsers: channel.botCanInviteUsers,
          canRestrictMembers: channel.botCanRestrictMembers,
        },
      });
      return { outcome: reconnectToken ? "reconnected" as const : "health_updated" as const, channel };
    }

    const candidates = await claimedConnectTokens(tx, input.actorTelegramUserId, now);
    if (candidates.length === 0) return { outcome: "ignored" as const, channel: null };
    if (candidates.length !== 1) throw new TelegramAccessError("telegram_admin_connect_ambiguous", 409);
    if (!state.privateChannel) throw new TelegramAccessError("telegram_private_channel_required", 409);
    if (!state.connected) throw new TelegramAccessError("telegram_bot_permissions_required", 409);
    const token = candidates[0];
    const subjectChannel = await tx.telegramSubjectChannel.findUnique({
      where: { subjectId: token.subjectId },
    });

    let channel;
    let eventType: "channel_connected" | "channel_rebound";
    let previousChatId: string | null = null;
    if (subjectChannel) {
      if (subjectChannel.isEnabled || subjectChannel.status !== "disconnected") {
        throw new TelegramAccessError("telegram_channel_already_connected", 409);
      }
      await assertRebindReady(tx, subjectChannel.id);
      previousChatId = subjectChannel.telegramChatId;
      channel = await tx.telegramSubjectChannel.update({
        where: { id: subjectChannel.id },
        data: {
          telegramChatId: input.chatId,
          title: input.chatTitle.trim(),
          status: "connected",
          isEnabled: false,
          botCanInviteUsers: true,
          botCanRestrictMembers: true,
          verifiedAt: now,
          lastHealthCheckedAt: now,
          createdBy: token.userId!,
        },
      });
      eventType = "channel_rebound";
    } else {
      channel = await tx.telegramSubjectChannel.create({
        data: {
          subjectId: token.subjectId,
          telegramChatId: input.chatId,
          title: input.chatTitle.trim(),
          status: "connected",
          isEnabled: false,
          botCanInviteUsers: true,
          botCanRestrictMembers: true,
          verifiedAt: now,
          lastHealthCheckedAt: now,
          createdBy: token.userId!,
        },
      });
      eventType = "channel_connected";
    }
    await tx.telegramLinkToken.update({
      where: { id: token.id },
      data: { state: "consumed", activeKey: null, consumedAt: now },
    });
    await appendTelegramAuditEvent(tx, {
      eventType,
      actorType: "admin",
      actorUserId: token.userId,
      telegramUserId: input.actorTelegramUserId,
      channelId: channel.id,
      linkTokenId: token.id,
      telegramUpdateId: input.updateId,
      idempotencyKey: (eventType === "channel_connected" ? "channel-connected:" : "channel-rebound:") + token.id,
      metadata: {
        subjectId: token.subjectId,
        enabled: false,
        ...(previousChatId ? { previousChatId, currentChatId: input.chatId } : {}),
      },
    });
    return { outcome: eventType === "channel_connected" ? "connected" as const : "rebound" as const, channel };
  });
}

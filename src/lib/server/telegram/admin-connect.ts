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
      await appendTelegramAuditEvent(tx, {
        eventType: "channel_health_changed",
        actorType: "telegram",
        telegramUserId: input.actorTelegramUserId,
        channelId: channel.id,
        telegramUpdateId: input.updateId,
        idempotencyKey: "channel-health:" + input.updateId,
        metadata: {
          status: channel.status,
          canInviteUsers: channel.botCanInviteUsers,
          canRestrictMembers: channel.botCanRestrictMembers,
        },
      });
      return { outcome: "health_updated" as const, channel };
    }

    const candidates = await tx.telegramLinkToken.findMany({
      where: {
        purpose: "admin_connect",
        state: "claimed",
        telegramUserId: input.actorTelegramUserId,
        expiresAt: { gt: now },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 2,
    });
    if (candidates.length === 0) return { outcome: "ignored" as const, channel: null };
    if (candidates.length !== 1) throw new TelegramAccessError("telegram_admin_connect_ambiguous", 409);
    if (!state.privateChannel) throw new TelegramAccessError("telegram_private_channel_required", 409);
    if (!state.connected) throw new TelegramAccessError("telegram_bot_permissions_required", 409);
    const token = candidates[0];
    const subjectChannel = await tx.telegramSubjectChannel.findUnique({
      where: { subjectId: token.subjectId },
      select: { id: true },
    });
    if (subjectChannel) throw new TelegramAccessError("telegram_channel_already_connected", 409);

    const channel = await tx.telegramSubjectChannel.create({
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
    await tx.telegramLinkToken.update({
      where: { id: token.id },
      data: { state: "consumed", activeKey: null, consumedAt: now },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "channel_connected",
      actorType: "admin",
      actorUserId: token.userId,
      telegramUserId: input.actorTelegramUserId,
      channelId: channel.id,
      linkTokenId: token.id,
      telegramUpdateId: input.updateId,
      idempotencyKey: "channel-connected:" + token.id,
      metadata: { subjectId: token.subjectId, enabled: false },
    });
    return { outcome: "connected" as const, channel };
  });
}

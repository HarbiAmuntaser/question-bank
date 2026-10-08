import "server-only";

import type { Prisma, TelegramMembership } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { appendTelegramAuditEvent, enqueueTelegramSyncJob } from "@/lib/server/telegram/audit";
import {
  resolveTelegramAccountAccess,
  resolveTelegramGuestAccess,
} from "@/lib/server/telegram/access";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import type { TelegramRequestPrincipal } from "@/lib/server/telegram/request-principal";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const TELEGRAM_USER_ID = /^[1-9][0-9]{0,19}$/;

async function databaseNow(tx: Prisma.TransactionClient) {
  const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return clock.now;
}

function nextAccessCheck(now: Date, expiresAt: Date | null) {
  const delay = getTelegramRuntimeConfig().expiryMaxDelayMinutes * 60_000;
  const scheduled = new Date(now.getTime() + delay);
  return expiresAt && expiresAt < scheduled ? expiresAt : scheduled;
}

async function currentAccess(
  tx: Prisma.TransactionClient,
  token: { userId: string | null; codeAccessGrantId: string | null; subjectId: string },
) {
  return token.userId
    ? resolveTelegramAccountAccess({ userId: token.userId, subjectId: token.subjectId }, tx)
    : resolveTelegramGuestAccess({
      codeAccessGrantId: token.codeAccessGrantId!,
      subjectId: token.subjectId,
    }, tx);
}

function membershipData(
  membership: TelegramMembership | null,
  accessExpiresAt: Date | null,
  now: Date,
) {
  const remainsActive = membership?.status === "active";
  return {
    status: remainsActive ? "active" as const : "pending_join" as const,
    accessExpiresAt,
    nextCheckAt: remainsActive ? nextAccessCheck(now, accessExpiresAt) : now,
    ...(remainsActive ? {} : {
      joinedAt: null,
      leftAt: null,
      removedAt: null,
      lastErrorCode: null,
    }),
  };
}

export async function completeTelegramStudentLink(input: {
  tokenId: string;
  telegramUserId: string;
  telegramUpdateId: string;
}) {
  if (!TELEGRAM_USER_ID.test(input.telegramUserId) || !/^[0-9]{1,32}$/.test(input.telegramUpdateId)) {
    throw new TelegramAccessError("telegram_update_invalid");
  }
  return telegramTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM telegram_link_tokens WHERE id = ${input.tokenId} FOR UPDATE`;
    const token = await tx.telegramLinkToken.findUnique({ where: { id: input.tokenId } });
    const now = await databaseNow(tx);
    if (!token || token.purpose !== "student_link" || token.state !== "claimed" ||
      token.telegramUserId !== input.telegramUserId || token.expiresAt <= now || !token.channelId) {
      throw new TelegramAccessError("telegram_link_invalid", 404);
    }
    const access = await currentAccess(tx, token);
    if (!access.allowed) throw new TelegramAccessError("telegram_access_required", 403);

    await tx.$queryRaw`SELECT id FROM telegram_subject_channels WHERE id = ${token.channelId} FOR UPDATE`;
    const channel = await tx.telegramSubjectChannel.findUnique({ where: { id: token.channelId } });
    if (!channel?.isEnabled || channel.status !== "connected" ||
      !channel.botCanInviteUsers || !channel.botCanRestrictMembers) {
      throw new TelegramAccessError("telegram_channel_unavailable", 409);
    }

    const [byTelegram, byAccount, byGrant] = await Promise.all([
      tx.telegramMembership.findUnique({
        where: { channelId_telegramUserId: { channelId: channel.id, telegramUserId: input.telegramUserId } },
      }),
      token.userId ? tx.telegramMembership.findUnique({
        where: { channelId_userId: { channelId: channel.id, userId: token.userId } },
      }) : Promise.resolve(null),
      token.codeAccessGrantId ? tx.telegramMembership.findUnique({
        where: { channelId_codeAccessGrantId: {
          channelId: channel.id,
          codeAccessGrantId: token.codeAccessGrantId,
        } },
      }) : Promise.resolve(null),
    ]);

    let membership = byTelegram ?? byAccount ?? byGrant;
    let previousGrantId: string | null = null;
    if (token.userId) {
      if ((byTelegram && (byTelegram.principalType !== "account" || byTelegram.userId !== token.userId)) ||
        (byAccount && byAccount.telegramUserId !== input.telegramUserId)) {
        throw new TelegramAccessError("telegram_identity_conflict", 409);
      }
    } else {
      if (byGrant && byGrant.telegramUserId !== input.telegramUserId) {
        throw new TelegramAccessError("telegram_grant_identity_conflict", 409);
      }
      if (byTelegram?.principalType === "account") {
        throw new TelegramAccessError("telegram_identity_conflict", 409);
      }
      if (byTelegram?.codeAccessGrantId && byTelegram.codeAccessGrantId !== token.codeAccessGrantId) {
        const oldGrant = await tx.codeAccessGrant.findUnique({
          where: { id: byTelegram.codeAccessGrantId },
          select: { isActive: true, revokedAt: true, expiresAt: true },
        });
        if (oldGrant?.isActive && !oldGrant.revokedAt && oldGrant.expiresAt > now) {
          throw new TelegramAccessError("telegram_identity_conflict", 409);
        }
        previousGrantId = byTelegram.codeAccessGrantId;
      }
    }

    const data = membershipData(membership, access.expiresAt, now);
    if (membership) {
      membership = await tx.telegramMembership.update({
        where: { id: membership.id },
        data: {
          ...data,
          principalType: token.userId ? "account" : "guest_grant",
          userId: token.userId,
          codeAccessGrantId: token.codeAccessGrantId,
          telegramUserId: input.telegramUserId,
        },
      });
    } else {
      membership = await tx.telegramMembership.create({
        data: {
          channelId: channel.id,
          principalType: token.userId ? "account" : "guest_grant",
          userId: token.userId,
          codeAccessGrantId: token.codeAccessGrantId,
          telegramUserId: input.telegramUserId,
          ...data,
        },
      });
    }

    await tx.telegramLinkToken.update({
      where: { id: token.id },
      data: { state: "consumed", activeKey: null, consumedAt: now },
    });
    if (previousGrantId) {
      await appendTelegramAuditEvent(tx, {
        eventType: "guest_membership_relinked",
        actorType: "guest",
        telegramUserId: input.telegramUserId,
        channelId: channel.id,
        membershipId: membership.id,
        idempotencyKey: "guest-relinked:" + token.id,
        metadata: { previousGrantId, currentGrantId: token.codeAccessGrantId! },
      });
    }
    await appendTelegramAuditEvent(tx, {
      eventType: "membership_linked",
      actorType: token.userId ? "account" : "guest",
      actorUserId: token.userId,
      telegramUserId: input.telegramUserId,
      channelId: channel.id,
      membershipId: membership.id,
      linkTokenId: token.id,
      telegramUpdateId: input.telegramUpdateId,
      idempotencyKey: "membership-linked:" + token.id,
      metadata: {
        principalType: token.userId ? "account" : "guest_grant",
        subjectId: token.subjectId,
        accessExpiresAt: access.expiresAt?.toISOString() ?? null,
      },
    });
    await enqueueTelegramSyncJob(tx, {
      type: "reconcile_membership",
      channelId: channel.id,
      membershipId: membership.id,
      dedupeKey: "membership-link:" + token.id,
      actorType: token.userId ? "account" : "guest",
      actorUserId: token.userId,
      auditIdempotencyKey: "sync-queued:link:" + token.id,
      metadata: { reason: "membership_linked" },
    });
    return { membership, alreadyActive: membership.status === "active" };
  });
}

export async function getTelegramPrincipalStatus(input: {
  subjectId: string;
  principal: TelegramRequestPrincipal;
}) {
  const channel = await prisma.telegramSubjectChannel.findUnique({
    where: { subjectId: input.subjectId },
    select: { id: true, isEnabled: true, status: true },
  });
  if (!channel) return { configured: false, enabled: false, channelStatus: null, membership: null };
  const membership = input.principal.type === "account"
    ? await prisma.telegramMembership.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId: input.principal.user.id } },
      select: { id: true, status: true, accessExpiresAt: true, joinedAt: true, lastErrorCode: true },
    })
    : await prisma.telegramMembership.findUnique({
      where: { channelId_codeAccessGrantId: {
        channelId: channel.id,
        codeAccessGrantId: input.principal.codeAccessGrantId,
      } },
      select: { id: true, status: true, accessExpiresAt: true, joinedAt: true, lastErrorCode: true },
    });
  return {
    configured: true,
    enabled: channel.isEnabled && channel.status === "connected",
    channelStatus: channel.status,
    membership,
  };
}

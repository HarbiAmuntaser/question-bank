import "server-only";

import type { Prisma } from "@prisma/client";

import { enqueueTelegramSyncJob } from "@/lib/server/telegram/audit";

export async function queueTelegramAccountReconciliation(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    subjectId: string;
    sourceType: "entitlement" | "account_grant";
    sourceId: string;
    actorUserId: string;
  },
) {
  const membership = await tx.telegramMembership.findFirst({
    where: {
      userId: input.userId,
      principalType: "account",
      channel: { subjectId: input.subjectId },
    },
    select: { id: true, channelId: true },
  });
  if (!membership) return { queued: false, membershipId: null } as const;
  await enqueueTelegramSyncJob(tx, {
    type: "reconcile_membership",
    channelId: membership.channelId,
    membershipId: membership.id,
    dedupeKey: "access-revoked:" + input.sourceType + ":" + input.sourceId,
    actorType: "admin",
    actorUserId: input.actorUserId,
    auditIdempotencyKey: "sync-queued:" + input.sourceType + ":" + input.sourceId,
    metadata: { reason: "access_revoked", sourceType: input.sourceType, sourceId: input.sourceId },
  });
  return { queued: true, membershipId: membership.id } as const;
}

export async function queueTelegramGrantReconciliation(
  tx: Prisma.TransactionClient,
  input: {
    grant: {
      id: string;
      principalType: "account" | "guest";
      userId: string | null;
      subjectId: string;
    };
    actorUserId: string;
  },
) {
  if (input.grant.principalType === "account" && input.grant.userId) {
    return queueTelegramAccountReconciliation(tx, {
      userId: input.grant.userId,
      subjectId: input.grant.subjectId,
      sourceType: "account_grant",
      sourceId: input.grant.id,
      actorUserId: input.actorUserId,
    });
  }
  const membership = await tx.telegramMembership.findFirst({
    where: {
      principalType: "guest_grant",
      codeAccessGrantId: input.grant.id,
      channel: { subjectId: input.grant.subjectId },
    },
    select: { id: true, channelId: true },
  });
  if (!membership) return { queued: false, membershipId: null } as const;
  await enqueueTelegramSyncJob(tx, {
    type: "reconcile_membership",
    channelId: membership.channelId,
    membershipId: membership.id,
    dedupeKey: "access-revoked:guest-grant:" + input.grant.id,
    actorType: "admin",
    actorUserId: input.actorUserId,
    auditIdempotencyKey: "sync-queued:guest-grant:" + input.grant.id,
    metadata: { reason: "access_revoked", sourceType: "guest_grant", sourceId: input.grant.id },
  });
  return { queued: true, membershipId: membership.id } as const;
}

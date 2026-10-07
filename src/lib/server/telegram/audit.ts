import "server-only";

import type { Prisma } from "@prisma/client";

import { TelegramAccessError } from "@/lib/server/telegram/errors";

const SAFE_KEY = /^[A-Za-z0-9:_-]{8,100}$/;
const FORBIDDEN_METADATA_KEY = /(token|secret|invite.?link|password|activation.?code|raw.?code|plain.?code|code.?value|full.?code)/i;

function assertSafeMetadata(value: unknown, depth = 0): void {
  if (depth > 6) throw new TelegramAccessError("telegram_audit_metadata_invalid");
  if (Array.isArray(value)) {
    value.forEach((item) => assertSafeMetadata(item, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_METADATA_KEY.test(key)) {
      throw new TelegramAccessError("telegram_audit_metadata_sensitive");
    }
    assertSafeMetadata(item, depth + 1);
  }
}

export async function appendTelegramAuditEvent(
  tx: Prisma.TransactionClient,
  input: {
    eventType: string;
    actorType: "admin" | "account" | "guest" | "telegram" | "system";
    actorUserId?: string | null;
    telegramUserId?: string | null;
    channelId?: string | null;
    membershipId?: string | null;
    linkTokenId?: string | null;
    telegramUpdateId?: string | null;
    idempotencyKey: string;
    metadata?: Prisma.InputJsonObject;
  },
) {
  if (!/^[a-z][a-z0-9_]{2,63}$/.test(input.eventType) || !SAFE_KEY.test(input.idempotencyKey)) {
    throw new TelegramAccessError("telegram_audit_invalid");
  }
  const metadata = input.metadata ?? {};
  assertSafeMetadata(metadata);
  return tx.telegramAuditEvent.create({
    data: {
      eventType: input.eventType,
      actorType: input.actorType,
      actorUserId: input.actorUserId ?? null,
      telegramUserId: input.telegramUserId ?? null,
      channelId: input.channelId ?? null,
      membershipId: input.membershipId ?? null,
      linkTokenId: input.linkTokenId ?? null,
      telegramUpdateId: input.telegramUpdateId ?? null,
      idempotencyKey: input.idempotencyKey,
      metadata,
    },
  });
}

export async function enqueueTelegramSyncJob(
  tx: Prisma.TransactionClient,
  input: {
    type: "reconcile_membership" | "verify_channel" | "mass_remove";
    channelId: string;
    membershipId?: string | null;
    dedupeKey: string;
    availableAt?: Date;
    actorType: "admin" | "account" | "guest" | "system";
    actorUserId?: string | null;
    auditIdempotencyKey: string;
    metadata?: Prisma.InputJsonObject;
  },
) {
  if (!SAFE_KEY.test(input.dedupeKey)) throw new TelegramAccessError("telegram_sync_job_invalid");
  const existing = await tx.telegramSyncJob.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing) return { job: existing, alreadyQueued: true };
  const job = await tx.telegramSyncJob.create({
    data: {
      type: input.type,
      channelId: input.channelId,
      membershipId: input.membershipId ?? null,
      dedupeKey: input.dedupeKey,
      availableAt: input.availableAt,
    },
  });
  await appendTelegramAuditEvent(tx, {
    eventType: "sync_queued",
    actorType: input.actorType,
    actorUserId: input.actorUserId,
    channelId: input.channelId,
    membershipId: input.membershipId,
    idempotencyKey: input.auditIdempotencyKey,
    metadata: { jobId: job.id, jobType: input.type, ...(input.metadata ?? {}) },
  });
  return { job, alreadyQueued: false };
}

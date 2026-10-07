import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { paymentSubjectWhere } from "@/lib/server/payment-scope";

type TelegramAccessDb = Pick<
  Prisma.TransactionClient,
  "subject" | "user" | "accessEntitlement" | "codeAccessGrant"
>;

export type TelegramAccessSource = {
  id: string;
  type: "manual_entitlement" | "account_code_grant" | "guest_code_grant";
  expiresAt: Date | null;
};

export type TelegramAccessDecision = {
  allowed: boolean;
  reason: "allowed" | "subject_unavailable" | "account_ineligible" | "access_inactive";
  principalType: "account" | "guest_grant";
  subjectId: string;
  userId: string | null;
  codeAccessGrantId: string | null;
  expiresAt: Date | null;
  sources: TelegramAccessSource[];
};

function effectiveExpiry(sources: TelegramAccessSource[]) {
  if (sources.some((source) => source.expiresAt === null)) return null;
  return sources.reduce<Date | null>((latest, source) => {
    if (!source.expiresAt) return latest;
    return !latest || source.expiresAt > latest ? source.expiresAt : latest;
  }, null);
}

export async function resolveTelegramAccountAccess(
  input: { userId: string; subjectId: string; now?: Date },
  db: TelegramAccessDb = prisma,
): Promise<TelegramAccessDecision> {
  const now = input.now ?? new Date();
  const [subject, user] = await Promise.all([
    db.subject.findFirst({ where: { id: input.subjectId, ...paymentSubjectWhere() }, select: { id: true } }),
    db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true, isActive: true, emailVerified: true },
    }),
  ]);
  const base = {
    principalType: "account" as const,
    subjectId: input.subjectId,
    userId: input.userId,
    codeAccessGrantId: null,
    expiresAt: null,
    sources: [] as TelegramAccessSource[],
  };
  if (!subject) return { ...base, allowed: false, reason: "subject_unavailable" };
  if (!user?.isActive || user.role !== "student" || !user.emailVerified) {
    return { ...base, allowed: false, reason: "account_ineligible" };
  }
  const [entitlements, grants] = await Promise.all([
    db.accessEntitlement.findMany({
      where: {
        userId: input.userId,
        subjectId: input.subjectId,
        scopeType: "subject",
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true, expiresAt: true },
    }),
    db.codeAccessGrant.findMany({
      where: {
        userId: input.userId,
        subjectId: input.subjectId,
        principalType: "account",
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gt: now },
      },
      select: { id: true, expiresAt: true },
    }),
  ]);
  const sources: TelegramAccessSource[] = [
    ...entitlements.map((row) => ({
      id: row.id,
      type: "manual_entitlement" as const,
      expiresAt: row.expiresAt,
    })),
    ...grants.map((row) => ({
      id: row.id,
      type: "account_code_grant" as const,
      expiresAt: row.expiresAt,
    })),
  ];
  return sources.length
    ? { ...base, allowed: true, reason: "allowed", sources, expiresAt: effectiveExpiry(sources) }
    : { ...base, allowed: false, reason: "access_inactive" };
}

export async function resolveTelegramGuestAccess(
  input: { codeAccessGrantId: string; subjectId: string; now?: Date },
  db: TelegramAccessDb = prisma,
): Promise<TelegramAccessDecision> {
  const now = input.now ?? new Date();
  const subject = await db.subject.findFirst({
    where: { id: input.subjectId, ...paymentSubjectWhere() },
    select: { id: true },
  });
  const base = {
    principalType: "guest_grant" as const,
    subjectId: input.subjectId,
    userId: null,
    codeAccessGrantId: input.codeAccessGrantId,
    expiresAt: null,
    sources: [] as TelegramAccessSource[],
  };
  if (!subject) return { ...base, allowed: false, reason: "subject_unavailable" };
  const grant = await db.codeAccessGrant.findFirst({
    where: {
      id: input.codeAccessGrantId,
      subjectId: input.subjectId,
      principalType: "guest",
      isActive: true,
      startsAt: { lte: now },
      expiresAt: { gt: now },
    },
    select: { id: true, expiresAt: true },
  });
  if (!grant) return { ...base, allowed: false, reason: "access_inactive" };
  const sources: TelegramAccessSource[] = [{
    id: grant.id,
    type: "guest_code_grant",
    expiresAt: grant.expiresAt,
  }];
  return { ...base, allowed: true, reason: "allowed", sources, expiresAt: grant.expiresAt };
}

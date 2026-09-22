import "server-only";
import { Prisma } from "@prisma/client";

export async function lockPaymentUsers(tx: Prisma.TransactionClient, ids: string[]) {
  const ordered = [...new Set(ids)].sort();
  await tx.$queryRaw`SELECT id FROM users WHERE id IN (${Prisma.join(ordered)}) ORDER BY id FOR UPDATE`;
}
export async function refreshPaymentAccount(tx: Prisma.TransactionClient, userId: string) {
  await tx.paymentAccountLock.upsert({ where: { userId },
    create: { userId, version: 1 }, update: { version: { increment: 1 } } });
}
export function liveSubjectGrantWhere(userId: string, subjectIds: string[], now = new Date()): Prisma.AccessEntitlementWhereInput {
  // A scheduled, still-active grant also blocks an implicit renewal.
  return { userId, subjectId: { in: subjectIds }, scopeType: "subject", isActive: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}
export function openSubjectOrderWhere(userId: string, subjectIds: string[], exceptId?: string, now = new Date()): Prisma.PaymentOrderWhereInput {
  return { userId, ...(exceptId ? { id: { not: exceptId } } : {}), items: { some: { subjectId: { in: subjectIds } } },
    OR: [{ status: { in: ["pending_review", "awaiting_additional_payment"] } }, { status: "pending_payment", expiresAt: { gt: now } }] };
}

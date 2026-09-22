import "server-only";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PaymentError } from "@/lib/server/payment-scope";

export async function requirePaymentAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new PaymentError("unauthorized", 401);
  if (!user.isActive || user.role !== "admin") throw new PaymentError("forbidden", 403);
  return user;
}

export async function recheckPaymentAdmin(tx: Prisma.TransactionClient, actor: { id: string; sessionVersion: number }) {
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true, sessionVersion: true } });
  if (!user?.isActive || user.role !== "admin" || user.sessionVersion !== actor.sessionVersion) throw new PaymentError("forbidden", 403);
}

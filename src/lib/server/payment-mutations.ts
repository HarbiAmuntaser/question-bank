import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accessPlanSelect, checkQuizAccess, serializeAccessPlan } from "@/lib/server/access-control";
import { hashSubscriptionCode, normalizeSubscriptionCode } from "@/lib/server/subscription-code";
import { redeemPaymentCodeSchema } from "@/validations/payment";
import { PaymentError, recheckPaymentStudent, requirePaymentCodePlan, requirePaymentStudent, requirePaymentSubject, requirePaymentCodes } from "@/lib/server/payment-scope";
import { lockPaymentUsers, refreshPaymentAccount } from "@/lib/server/payment-order-access";

export async function paymentTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      // PostgreSQL serialization/deadlock errors from explicit row locks are wrapped as P2010.
      const retryable = ["P2034", "P2002"].includes(error.code) ||
        (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)));
      if (!retryable) throw error;
    }
  }
  throw new PaymentError("payment_conflict_retry", 409);
}

export async function redeemSubscriptionCode(raw: unknown) {
  requirePaymentCodes();
  const input = redeemPaymentCodeSchema.parse(raw);
  const user = await requirePaymentStudent();
  const subject = await requirePaymentSubject(input.subjectId);
  if (input.quizId) {
    const access = await checkQuizAccess({ quizId: input.quizId });
    if (access.subjectId !== subject.id || ["not_found", "missing_context", "out_of_scope"].includes(access.reason)) throw new PaymentError("payment_target_mismatch", 409);
  }
  const normalized = normalizeSubscriptionCode(input.code);
  if (!normalized) throw new PaymentError("invalid_code");
  return paymentTransaction(async (tx) => {
    requirePaymentCodes();
    await lockPaymentUsers(tx, [user.id]);
    await recheckPaymentStudent(tx, user);
    await requirePaymentSubject(subject.id, tx);
    const code = await tx.subscriptionCode.findUnique({ where: { codeHash: hashSubscriptionCode(normalized) },
      include: { plan: { select: { ...accessPlanSelect, isActive: true, defaultDurationDays: true } } } });
    if (!code) throw new PaymentError("invalid_code");
    if (code.plan.scopeType !== "subject" || code.plan.majorId !== null || code.plan.subjectId !== subject.id) throw new PaymentError("payment_target_mismatch", 409);
    requirePaymentCodePlan(code.planId);
    if (!code.plan.isActive) throw new PaymentError("inactive_plan");
    const now = new Date();
    // A repeat by the same account is idempotent, never a renewal of an expired grant.
    const existing = await tx.accessEntitlement.findUnique({ where: { userId_codeId: { userId: user.id, codeId: code.id } } });
    if (existing) return { alreadyRedeemed: true, entitlement: existing, plan: serializeAccessPlan(code.plan), codePreview: code.codePreview };
    await refreshPaymentAccount(tx, user.id);
    if (!code.isActive) throw new PaymentError("inactive_code");
    if (code.startsAt && code.startsAt > now) throw new PaymentError("code_not_started");
    if (code.expiresAt && code.expiresAt <= now) throw new PaymentError("code_expired");
    if (code.usedCount >= code.maxUses) throw new PaymentError("code_used");
    const activeEntitlement = await tx.accessEntitlement.findFirst({ where: {
      userId: user.id, subjectId: subject.id, scopeType: "subject", isActive: true,
      startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    }, select: { id: true } });
    if (activeEntitlement) throw new PaymentError("active_entitlement_exists", 409);
    const days = code.durationDays ?? code.plan.defaultDurationDays;
    if (!Number.isInteger(days) || days! < 1 || days! > 36500) throw new PaymentError("invalid_code_window", 409);
    const updated = await tx.subscriptionCode.updateMany({ where: { id: code.id, usedCount: { lt: code.maxUses }, isActive: true }, data: { usedCount: { increment: 1 } } });
    if (updated.count !== 1) throw new PaymentError("code_used");
    const entitlement = await tx.accessEntitlement.create({ data: {
      userId: user.id, codeId: code.id, scopeType: "subject", subjectId: subject.id,
      startsAt: now, expiresAt: new Date(now.getTime() + days! * 86400000), isActive: true,
    } });
    await tx.paymentCodeRedemptionEvent.create({ data: {
      userId: user.id, codeId: code.id, planId: code.planId, subjectId: subject.id,
      entitlementId: entitlement.id, usageNumber: code.usedCount + 1,
    } });
    return { alreadyRedeemed: false, entitlement, plan: serializeAccessPlan(code.plan), codePreview: code.codePreview };
  });
}

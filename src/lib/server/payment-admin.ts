import "server-only";
import { createHash } from "node:crypto";
import type { AccessEntitlement, PaidAccessPlan, Prisma, SubscriptionCode } from "@prisma/client";
import { issuePaymentCodeSchema, paymentPlanSchema } from "@/validations/payment";
import { paymentAdminChangeSchema, paymentAdminReasonSchema, paymentAdminTargetSchema } from "@/validations/payment-admin";
import { PaymentError, paymentPlanWhere, requirePaymentCodePlan, requirePaymentSubject, requirePaymentV1, requirePaymentCodes } from "@/lib/server/payment-scope";
import { paymentTransaction } from "@/lib/server/payment-mutations";
import { requirePaymentAdmin, recheckPaymentAdmin } from "@/lib/server/payment-admin-auth";
import { lockPaymentUsers } from "@/lib/server/payment-order-access";
import { codePreviewFromPlainCode, generateSubscriptionCode, hashSubscriptionCode } from "@/lib/server/subscription-code";
import { assertPaymentPlanPrivateSummaryMedia } from "@/lib/server/payment-media";

function snapshot(value: object): Prisma.InputJsonObject { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject; }
function codeSnapshot(row: SubscriptionCode) {
  return snapshot({ id: row.id, planId: row.planId, isActive: row.isActive,
    maxUses: row.maxUses, usedCount: row.usedCount, durationDays: row.durationDays, startsAt: row.startsAt,
    expiresAt: row.expiresAt, updatedAt: row.updatedAt });
}
function grantSnapshot(row: AccessEntitlement) {
  return snapshot({ id: row.id, userId: row.userId, subjectId: row.subjectId, scopeType: row.scopeType,
    orderItemId: row.orderItemId, codeId: row.codeId, isActive: row.isActive, startsAt: row.startsAt,
    expiresAt: row.expiresAt, updatedAt: row.updatedAt });
}
function assertUnchanged(row: { updatedAt: Date }, expected?: string) {
  if (!expected || row.updatedAt.toISOString() !== expected) throw new PaymentError("payment_target_changed", 409);
}
function nextUpdate(row: { updatedAt: Date }) { return new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)); }
function codeIssuanceRequestHash(input: ReturnType<typeof issuePaymentCodeSchema.parse>, reason: string) {
  return createHash("sha256").update(JSON.stringify({
    planId: input.planId,
    maxUses: input.maxUses,
    durationDays: input.durationDays,
    startsAt: input.startsAt?.toISOString() ?? null,
    expiresAt: input.expiresAt?.toISOString() ?? null,
    note: input.note,
    reason,
  })).digest("hex");
}

export async function savePaymentPlan(raw: unknown, change: unknown, id?: string) {
  const input = paymentPlanSchema.parse(raw); const meta = paymentAdminChangeSchema.parse(change);
  if (id) paymentAdminTargetSchema.parse(id);
  if (input.isActive) requirePaymentV1();
  const actor = await requirePaymentAdmin();
  return paymentTransaction(async (tx) => {
    await lockPaymentUsers(tx, [actor.id]); await recheckPaymentAdmin(tx, actor);
    if (input.isActive) requirePaymentV1();
    await requirePaymentSubject(input.subjectId, tx);
    if (input.isActive) {
      try { await assertPaymentPlanPrivateSummaryMedia(tx, input.subjectId); }
      catch (error) {
        if (error instanceof Error && error.message === "payment_private_media_required") {
          throw new PaymentError("payment_private_media_required", 409);
        }
        throw error;
      }
    }
    let old: PaidAccessPlan | null = null;
    if (id) {
      await tx.$queryRaw`SELECT id FROM paid_access_plans WHERE id = ${id} FOR UPDATE`;
      old = await tx.paidAccessPlan.findUnique({ where: { id } });
      if (!old || old.scopeType !== "subject" || old.majorId !== null || old.subjectId !== input.subjectId) throw new PaymentError("payment_target_immutable", 409);
      assertUnchanged(old, meta.expectedUpdatedAt);
      if (old.isActive && !input.isActive && !meta.confirmContentChange) throw new PaymentError("payment_content_confirmation_required", 409);
    }
    const data = { ...input, majorId: null };
    const plan = old ? await tx.paidAccessPlan.update({ where: { id }, data: { ...data, updatedAt: nextUpdate(old) } }) : await tx.paidAccessPlan.create({ data });
    await tx.paymentAdminEvent.create({ data: { actorId: actor.id, actorSessionVersion: actor.sessionVersion,
      action: old ? "plan_updated" : "plan_created", planId: plan.id, reason: meta.reason,
      before: snapshot(old ?? {}), after: snapshot(plan) } });
    return plan;
  });
}

export async function issuePaymentCode(raw: unknown, reason: unknown) {
  requirePaymentCodes();
  const input = issuePaymentCodeSchema.parse(raw); const note = paymentAdminReasonSchema.parse(reason);
  const requestHash = codeIssuanceRequestHash(input, note);
  const actor = await requirePaymentAdmin();
  return paymentTransaction(async (tx) => {
    requirePaymentCodes(); await lockPaymentUsers(tx, [actor.id]); await recheckPaymentAdmin(tx, actor);
    const existing = await tx.subscriptionCode.findUnique({
      where: { createdBy_issuanceIdempotencyKey: { createdBy: actor.id, issuanceIdempotencyKey: input.idempotencyKey } },
      select: { id: true, issuanceRequestHash: true },
    });
    if (existing) {
      if (existing.issuanceRequestHash !== requestHash) throw new PaymentError("payment_idempotency_conflict", 409);
      return { alreadyIssued: true, codeId: existing.id, plainCode: null };
    }
    requirePaymentCodePlan(input.planId);
    await tx.$queryRaw`SELECT id FROM paid_access_plans WHERE id = ${input.planId} FOR SHARE`;
    const plan = await tx.paidAccessPlan.findFirst({ where: { id: input.planId, isActive: true, ...paymentPlanWhere() },
      select: { id: true, defaultMaxUses: true, defaultDurationDays: true } });
    if (!plan) throw new PaymentError("payment_scope_not_allowed", 409);
    const durationDays = input.durationDays ?? plan.defaultDurationDays;
    if (!Number.isInteger(durationDays) || durationDays! < 1 || durationDays! > 36500) throw new PaymentError("invalid_code_window", 409);
    const plainCode = generateSubscriptionCode();
    const code = await tx.subscriptionCode.create({ data: {
      planId: plan.id, codeHash: hashSubscriptionCode(plainCode), codePreview: codePreviewFromPlainCode(plainCode),
      durationDays: input.durationDays, startsAt: input.startsAt, expiresAt: input.expiresAt,
      maxUses: input.maxUses ?? plan.defaultMaxUses, usedCount: 0, isActive: true, note: input.note, createdBy: actor.id,
      issuanceIdempotencyKey: input.idempotencyKey, issuanceRequestHash: requestHash,
    } });
    await tx.paymentAdminEvent.create({ data: { actorId: actor.id, actorSessionVersion: actor.sessionVersion,
      action: "code_issued", codeId: code.id, reason: note, before: {}, after: codeSnapshot(code) } });
    return { alreadyIssued: false, codeId: code.id, plainCode };
  });
}

export async function disablePaymentPlan(id: string, raw: unknown) {
  paymentAdminTargetSchema.parse(id); const input = paymentAdminChangeSchema.parse(raw); const actor = await requirePaymentAdmin();
  return paymentTransaction(async (tx) => {
    await lockPaymentUsers(tx, [actor.id]); await recheckPaymentAdmin(tx, actor);
    await tx.$queryRaw`SELECT id FROM paid_access_plans WHERE id = ${id} FOR UPDATE`;
    const old = await tx.paidAccessPlan.findUnique({ where: { id } });
    if (!old) throw new PaymentError("not_found", 404);
    if (!old.isActive) return { alreadyDisabled: true };
    assertUnchanged(old, input.expectedUpdatedAt);
    if (!input.confirmContentChange) throw new PaymentError("payment_content_confirmation_required", 409);
    const plan = await tx.paidAccessPlan.update({ where: { id }, data: { isActive: false, updatedAt: nextUpdate(old) } });
    await tx.paymentAdminEvent.create({ data: { actorId: actor.id, actorSessionVersion: actor.sessionVersion,
      action: "plan_disabled", planId: id, reason: input.reason, before: snapshot(old), after: snapshot(plan) } });
    return { alreadyDisabled: false };
  });
}

export async function disablePaymentCode(id: string, raw: unknown) {
  paymentAdminTargetSchema.parse(id); const input = paymentAdminChangeSchema.parse(raw); const actor = await requirePaymentAdmin();
  return paymentTransaction(async (tx) => {
    await lockPaymentUsers(tx, [actor.id]); await recheckPaymentAdmin(tx, actor);
    await tx.$queryRaw`SELECT id FROM subscription_codes WHERE id = ${id} FOR UPDATE`;
    const old = await tx.subscriptionCode.findUnique({ where: { id } });
    if (!old) throw new PaymentError("not_found", 404);
    if (!old.isActive) return { alreadyDisabled: true };
    assertUnchanged(old, input.expectedUpdatedAt);
    const code = await tx.subscriptionCode.update({ where: { id }, data: { isActive: false, updatedAt: nextUpdate(old) } });
    await tx.paymentAdminEvent.create({ data: { actorId: actor.id, actorSessionVersion: actor.sessionVersion,
      action: "code_disabled", codeId: id, reason: input.reason, before: codeSnapshot(old), after: codeSnapshot(code) } });
    return { alreadyDisabled: false };
  });
}

export async function revokePaymentEntitlement(id: string, raw: unknown) {
  paymentAdminTargetSchema.parse(id); const input = paymentAdminChangeSchema.parse(raw); const actor = await requirePaymentAdmin();
  return paymentTransaction(async (tx) => {
    const target = await tx.accessEntitlement.findUnique({ where: { id }, select: { userId: true } });
    if (!target) throw new PaymentError("not_found", 404);
    await lockPaymentUsers(tx, [actor.id, ...(target.userId ? [target.userId] : [])]); await recheckPaymentAdmin(tx, actor);
    await tx.$queryRaw`SELECT id FROM access_entitlements WHERE id = ${id} FOR UPDATE`;
    const old = await tx.accessEntitlement.findUniqueOrThrow({ where: { id } });
    if (!old.isActive) return { alreadyDisabled: true };
    assertUnchanged(old, input.expectedUpdatedAt);
    const grant = await tx.accessEntitlement.update({ where: { id }, data: { isActive: false, updatedAt: nextUpdate(old) } });
    await tx.paymentAdminEvent.create({ data: { actorId: actor.id, actorSessionVersion: actor.sessionVersion,
      action: "entitlement_revoked", entitlementId: id, reason: input.reason, before: grantSnapshot(old), after: grantSnapshot(grant) } });
    return { alreadyDisabled: false };
  });
}

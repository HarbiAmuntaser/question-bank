import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type PaymentOrderStatus, type PaymentReviewAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePaymentAdmin as requireReviewer, recheckPaymentAdmin as recheckReviewer } from "@/lib/server/payment-admin-auth";
import { paymentPlanWhere, paymentReviewEnabled, recheckPaymentStudent, requirePaymentStudent, requirePaymentReview } from "@/lib/server/payment-scope";
import { paymentTransaction } from "@/lib/server/payment-mutations";
import { effectiveOrderStatus, includeOrder, OrderError, serializeOrder } from "@/lib/server/payment-orders";
import { liveSubjectGrantWhere, lockPaymentUsers, openSubjectOrderWhere, refreshPaymentAccount } from "@/lib/server/payment-order-access";
import { adminOrderListSchema, adminReviewSchema, reviewHistorySchema, reviewSubmissionSchema } from "@/validations/payment-review";
import { orderIdSchema } from "@/validations/payment-order";
import type { AdminOrder } from "@/lib/payment-reviews";

type Db = Prisma.TransactionClient;
type Order = Prisma.PaymentOrderGetPayload<{ include: typeof includeOrder }>;
type Identity = { id: string; sessionVersion: number };
function requestHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
async function lockOrder(tx: Db, id: string, actor: Identity, student: boolean) {
  const target = await tx.paymentOrder.findFirst({ where: { id, ...(student ? { userId: actor.id } : {}) }, select: { userId: true } });
  if (!target) throw new OrderError("not_found", 404);
  await lockPaymentUsers(tx, [actor.id, target.userId]);
  if (student) await recheckPaymentStudent(tx, actor); else await recheckReviewer(tx, actor);
  await tx.$queryRaw`SELECT id FROM payment_orders WHERE id = ${id} FOR UPDATE`;
  return tx.paymentOrder.findUniqueOrThrow({ where: { id }, include: includeOrder });
}
async function retryEvent(tx: Db, order: Order, key: string, hash: string, actorId: string, expectedVersion: number) {
  const prior = await tx.paymentReviewEvent.findUnique({ where: { orderId_idempotencyKey: { orderId: order.id, idempotencyKey: key } } });
  if (prior) {
    if (prior.requestHash !== hash || prior.actorId !== actorId) throw new OrderError("idempotency_key_reused");
    return prior;
  }
  if (order.reviewVersion !== expectedVersion) throw new OrderError("order_changed");
  return null;
}
async function netAmount(tx: Db, id: string) {
  return (await tx.paymentLedgerEntry.aggregate({ where: { orderId: id }, _sum: { amount: true } }))._sum.amount ?? new Prisma.Decimal(0);
}
async function finishReview(tx: Db, order: Order, status: PaymentOrderStatus) {
  return tx.paymentOrder.update({ where: { id: order.id }, data: {
    status, activeCartKey: null, reviewVersion: { increment: 1 }, reviewStartedAt: order.reviewStartedAt ?? new Date(),
  }, include: includeOrder });
}

export async function submitOrderReview(id: string, raw: unknown) {
  requirePaymentReview(); orderIdSchema.parse(id); const input = reviewSubmissionSchema.parse(raw); const actor = await requirePaymentStudent();
  const hash = requestHash({ action: "submitted", ...input });
  return paymentTransaction(async (tx) => {
    requirePaymentReview(); const order = await lockOrder(tx, id, actor, true);
    const prior = await retryEvent(tx, order, input.idempotencyKey, hash, actor.id, input.expectedVersion);
    if (prior) return serializeOrder(order, tx);
    await refreshPaymentAccount(tx, order.userId);
    if (!["pending_payment", "awaiting_additional_payment"].includes(effectiveOrderStatus(order))) throw new OrderError("order_not_reviewable");
    await tx.paymentReviewEvent.create({ data: {
      orderId: id, actorId: actor.id, actorSessionVersion: actor.sessionVersion, action: "submitted", version: order.reviewVersion + 1,
      fromStatus: order.status, toStatus: "pending_review", idempotencyKey: input.idempotencyKey, requestHash: hash,
    } });
    // Student submission records intent only. No ledger entry or entitlement is created.
    return serializeOrder(await finishReview(tx, order, "pending_review"), tx);
  });
}

async function approvalConflict(tx: Db, order: Order, paid: Prisma.Decimal) {
  if (!paid.eq(order.total)) return paid.gt(order.total) ? "overpayment_requires_settlement" : "payment_incomplete";
  const student = await tx.user.findUnique({ where: { id: order.userId }, select: { role: true, isActive: true, emailVerified: true } });
  if (!student?.isActive || student.role !== "student" || !student.emailVerified) return "student_account_unavailable";
  const ids = order.items.map((item) => item.subjectId);
  await tx.$queryRaw`SELECT s.id FROM subjects s JOIN majors m ON m.id = s."majorId"
    JOIN universities u ON u.id = m."universityId" JOIN paid_access_plans p ON p."subjectId" = s.id
    WHERE p.id IN (${Prisma.join(order.items.map((item) => item.planId))}) ORDER BY s.id, p.id FOR SHARE OF s, m, u, p`;
  const plans = await tx.paidAccessPlan.findMany({ where: { id: { in: order.items.map((i) => i.planId) }, isActive: true, ...paymentPlanWhere() }, select: { id: true, subjectId: true } });
  if (plans.length !== order.items.length || order.items.some((item) => !plans.some((plan) => plan.id === item.planId && plan.subjectId === item.subjectId))) return "payment_scope_not_allowed";
  if (await tx.accessEntitlement.findFirst({ where: liveSubjectGrantWhere(order.userId, ids), select: { id: true } })) return "active_entitlement_exists";
  if (await tx.paymentOrder.findFirst({ where: openSubjectOrderWhere(order.userId, ids, order.id), select: { id: true } })) return "overlapping_order_exists";
  return null;
}

export async function reviewOrder(id: string, raw: unknown) {
  requirePaymentReview(); orderIdSchema.parse(id); const input = adminReviewSchema.parse(raw); const actor = await requireReviewer();
  const hash = requestHash(input);
  return paymentTransaction(async (tx) => {
    requirePaymentReview(); const order = await lockOrder(tx, id, actor, false);
    const prior = await retryEvent(tx, order, input.idempotencyKey, hash, actor.id, input.expectedVersion);
    if (prior) return { orderId: id, version: order.reviewVersion, conflictCode: prior.conflictCode, alreadyApplied: true };
    await refreshPaymentAccount(tx, order.userId);
    if (order.status === "approved") throw new OrderError("order_already_approved");
    const paid = await netAmount(tx, id);
    let action: PaymentReviewAction = input.action;
    let status: PaymentOrderStatus = order.status;
    let conflictCode: string | null = null;
    if (["receipt", "refund", "correction"].includes(action)) status = "pending_review";
    else if (action === "submitted") {
      if (!["pending_payment", "awaiting_additional_payment"].includes(effectiveOrderStatus(order))) throw new OrderError("order_not_reviewable");
      status = "pending_review";
    } else {
      if (!["pending_review", "awaiting_additional_payment"].includes(order.status)) throw new OrderError("order_not_reviewable");
      if (action === "approved") {
        conflictCode = await approvalConflict(tx, order, paid);
        if (conflictCode) action = "approval_blocked"; else status = "approved";
      }
      if (action === "additional_requested") {
        if (paid.lt(0) || paid.gte(order.total)) throw new OrderError("no_additional_payment_due");
        status = "awaiting_additional_payment";
      }
      if (action === "rejected") {
        if (!paid.isZero()) throw new OrderError("settlement_required_before_rejection");
        status = "rejected";
      }
    }
    if (input.action === "receipt" || input.action === "refund") {
      if (await tx.paymentLedgerEntry.findUnique({ where: { reference: input.reference }, select: { id: true } })) throw new OrderError("transfer_reference_used");
      if (input.action === "refund" && new Prisma.Decimal(input.amount).gt(paid)) throw new OrderError("refund_exceeds_balance");
    }
    const now = new Date();
    const event = await tx.paymentReviewEvent.create({ data: {
      orderId: id, actorId: actor.id, actorSessionVersion: actor.sessionVersion, action, version: order.reviewVersion + 1,
      fromStatus: order.status, toStatus: status, idempotencyKey: input.idempotencyKey, requestHash: hash,
      internalNote: input.internalNote, studentMessage: conflictCode ? null : input.studentMessage || null, conflictCode, createdAt: now,
    } });
    if (input.action === "receipt" || input.action === "refund") {
      await tx.paymentLedgerEntry.create({ data: { orderId: id, eventId: event.id, kind: input.action,
        amount: new Prisma.Decimal(input.amount).mul(input.action === "refund" ? -1 : 1), reference: input.reference } });
    }
    if (input.action === "correction") {
      const source = await tx.paymentLedgerEntry.findFirst({ where: { id: input.entryId, orderId: id }, include: { adjustments: { select: { id: true } } } });
      if (!source || source.kind === "void" || source.adjustments.length) throw new OrderError("ledger_entry_not_correctable");
      const replacement = new Prisma.Decimal(input.amount).mul(source.amount.isNegative() ? -1 : 1);
      if (replacement.eq(source.amount)) throw new OrderError("correction_unchanged");
      await tx.paymentLedgerEntry.create({ data: { orderId: id, eventId: event.id, kind: "void", sourceId: source.id, amount: source.amount.negated() } });
      if (!replacement.isZero()) await tx.paymentLedgerEntry.create({ data: { orderId: id, eventId: event.id, kind: "correction", sourceId: source.id, amount: replacement } });
    }
    await finishReview(tx, order, status);
    if (status === "approved") {
      // Every grant shares the same approval instant; a failure rolls back status, audit and ALL grants.
      for (const item of order.items) await tx.accessEntitlement.create({ data: {
        orderItemId: item.id, userId: order.userId, codeId: null,
        scopeType: "subject", subjectId: item.subjectId, isActive: true, startsAt: now,
        expiresAt: item.durationDays === null ? null : new Date(now.getTime() + item.durationDays * 86400000),
      } });
    }
    return { orderId: id, version: order.reviewVersion + 1, conflictCode, alreadyApplied: false };
  });
}

export async function listAdminOrders(raw: unknown) {
  await requireReviewer(); const { q, status, page } = adminOrderListSchema.parse(raw);
  const now = new Date();
  const state: Prisma.PaymentOrderWhereInput = status === "all" ? {} : status === "expired"
    ? { OR: [{ status: "expired" }, { status: "pending_payment", expiresAt: { lte: now }, ledger: { none: {} } }] }
    : status === "pending_payment" ? { status, expiresAt: { gt: now } } : { status };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.paymentOrder.findMany({ where: { AND: [state, { OR: [
      { reference: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }, { user: { name: { contains: q, mode: "insensitive" } } },
    ] }] }, include: { ...includeOrder, user: { select: { name: true, email: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 31 });
    return { items: await Promise.all(rows.slice(0, 30).map(async (order) => ({ ...await serializeOrder(order, tx), student: order.user }))),
      page, hasNext: rows.length > 30, q, status };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function getAdminOrder(id: string, raw: unknown = {}): Promise<AdminOrder> {
  await requireReviewer(); orderIdSchema.parse(id); const { before } = reviewHistorySchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({ where: { id }, include: { ...includeOrder,
      user: { select: { id: true, name: true, email: true, isActive: true } },
      items: { orderBy: { subjectId: "asc" }, include: { entitlement: { select: { id: true, expiresAt: true, isActive: true } } } },
    } });
    if (!order) throw new OrderError("not_found", 404);
    const activity = await tx.paymentReviewEvent.findMany({ where: { orderId: id, ...(before ? { version: { lt: before } } : {}) },
      orderBy: { version: "desc" }, take: 31, include: { actor: { select: { name: true, email: true } },
        ledger: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { adjustments: { select: { id: true } } } } } });
    return { ...await serializeOrder(order, tx), student: order.user, reviewEnabled: paymentReviewEnabled(),
      activity: activity.slice(0, 30).map((event) => ({ id: event.id, action: event.action, version: event.version,
        actor: event.actor.name || event.actor.email, createdAt: event.createdAt.toISOString(), internalNote: event.internalNote,
        studentMessage: event.studentMessage, conflictCode: event.conflictCode,
        ledger: event.ledger.map((entry) => ({ id: entry.id, kind: entry.kind, amount: entry.amount.toFixed(2), reference: entry.reference,
          sourceId: entry.sourceId, canCorrect: entry.kind !== "void" && entry.adjustments.length === 0 && order.status !== "approved" })) })),
      nextBefore: activity.length > 30 ? activity[29].version : null,
      grants: order.items.flatMap((item) => item.entitlement ? [{ subjectId: item.subjectId, entitlementId: item.entitlement.id,
        expiresAt: item.entitlement.expiresAt?.toISOString() ?? null, isActive: item.entitlement.isActive }] : []),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

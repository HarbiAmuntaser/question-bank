import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type ContactMethod, type PaymentOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderPlan, OrderQuote, StudentOrder } from "@/lib/payment-orders";
import { paymentTransaction } from "@/lib/server/payment-mutations";
import { PaymentError, paymentLaunchPlanIds, paymentPlanWhere, paymentReviewEnabled, recheckPaymentStudent, requirePaymentStudent, requirePaymentSales, requirePaymentReview } from "@/lib/server/payment-scope";
import { createOrderSchema, orderCatalogSchema, orderCursorSchema, orderIdSchema, orderListSchema, orderQuoteSchema } from "@/validations/payment-order";
import { liveSubjectGrantWhere, lockPaymentUsers, openSubjectOrderWhere, refreshPaymentAccount } from "@/lib/server/payment-order-access";

const QUOTE_HOURS = 24;
export const includeOrder = { items: { orderBy: { subjectId: "asc" as const } }, _count: { select: { ledger: true } },
  reviews: { where: { studentMessage: { not: null } }, orderBy: { version: "desc" as const }, take: 20,
    select: { id: true, studentMessage: true, createdAt: true } } } satisfies Prisma.PaymentOrderInclude;
type OrderRow = Prisma.PaymentOrderGetPayload<{ include: typeof includeOrder }>;
const planSelect = {
  id: true, subjectId: true, title: true, price: true, currency: true, defaultDurationDays: true,
  whatsappNumber: true, telegramUsername: true,
  subject: { select: { name: true, major: { select: { university: { select: { name: true } } } } } },
} satisfies Prisma.PaidAccessPlanSelect;
type PlanRow = Prisma.PaidAccessPlanGetPayload<{ select: typeof planSelect }>;
type Db = Prisma.TransactionClient;

export class OrderError extends PaymentError {
  constructor(code: string, status = 409, public readonly orderId?: string) { super(code, status); }
}
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function destination(plan: PlanRow, method: ContactMethod) {
  if (method === "whatsapp") return /^\+?\d{6,20}$/.test(plan.whatsappNumber ?? "") ? plan.whatsappNumber!.replace(/^\+/, "") : null;
  return /^@?[a-zA-Z0-9_]{5,32}$/.test(plan.telegramUsername ?? "") ? plan.telegramUsername!.replace(/^@/, "").toLowerCase() : null;
}
function commonDestination(plans: PlanRow[], method: ContactMethod) {
  const target = plans[0] ? destination(plans[0], method) : null;
  return target && plans.every((plan) => destination(plan, method) === target) ? target : null;
}
function planItem(plan: PlanRow): OrderPlan {
  return { planId: plan.id, subjectId: plan.subjectId!, subjectName: plan.subject!.name,
    universityName: plan.subject!.major.university.name, planTitle: plan.title,
    price: plan.price!.toFixed(2), durationDays: plan.defaultDurationDays };
}
async function loadPlans(ids: string[], db: Db) {
  requirePaymentSales(ids);
  const rows = await db.paidAccessPlan.findMany({ where: { id: { in: ids }, isActive: true, ...paymentPlanWhere() }, select: planSelect, orderBy: { id: "asc" } });
  if (rows.length !== ids.length) throw new OrderError("payment_scope_not_allowed");
  if (new Set(rows.map((p) => p.subjectId)).size !== rows.length) throw new OrderError("duplicate_subject", 400);
  if (rows.some((p) => p.currency !== "SAR" || !p.price || p.price.lte(0) ||
    (p.defaultDurationDays !== null && (p.defaultDurationDays < 1 || p.defaultDurationDays > 36500)))) throw new OrderError("plan_not_orderable");
  return rows;
}
function quote(plans: PlanRow[]): OrderQuote {
  const items = plans.map(planItem);
  const contacts = { whatsapp: commonDestination(plans, "whatsapp"), telegram: commonDestination(plans, "telegram") };
  const total = plans.reduce((sum, plan) => sum.plus(plan.price!), new Prisma.Decimal(0)).toFixed(2);
  return { items, total, currency: "SAR", methods: (Object.keys(contacts) as ContactMethod[]).filter((method) => contacts[method]),
    version: hash({ items, contacts, total, currency: "SAR", validForHours: QUOTE_HOURS }), validForHours: QUOTE_HOURS };
}
export function effectiveOrderStatus(order: { status: PaymentOrderStatus; expiresAt: Date; reviewStartedAt?: Date | null; _count?: { ledger: number } }, now = new Date()): PaymentOrderStatus {
  return order.status === "pending_payment" && !order.reviewStartedAt && !order._count?.ledger && order.expiresAt <= now ? "expired" : order.status;
}
export async function serializeOrder(order: OrderRow, db: Db): Promise<StudentOrder> {
  const status = effectiveOrderStatus(order);
  const sum = await db.paymentLedgerEntry.aggregate({ where: { orderId: order.id }, _sum: { amount: true } });
  const paid = sum._sum.amount ?? new Prisma.Decimal(0);
  const difference = order.total.minus(paid);
  return { id: order.id, reference: order.reference, status, total: order.total.toFixed(2), currency: order.currency,
    contactMethod: order.contactMethod, createdAt: order.createdAt.toISOString(), expiresAt: order.expiresAt.toISOString(),
    contactRequestedAt: order.contactRequestedAt?.toISOString() ?? null,
    items: order.items.map((item) => ({ planId: item.planId, subjectId: item.subjectId, subjectName: item.subjectName,
      universityName: item.universityName, planTitle: item.planTitle, price: item.price.toFixed(2), durationDays: item.durationDays })),
    canContact: ["pending_payment", "pending_review", "awaiting_additional_payment"].includes(status) && paymentReviewEnabled(),
    canCancel: status === "pending_payment" && !order._count.ledger,
    canSubmitReview: ["pending_payment", "awaiting_additional_payment"].includes(status) && paymentReviewEnabled(),
    reviewVersion: order.reviewVersion, reviewStartedAt: order.reviewStartedAt?.toISOString() ?? null,
    verifiedAmount: paid.toFixed(2), remainingAmount: Prisma.Decimal.max(0, difference).toFixed(2),
    excessAmount: Prisma.Decimal.max(0, difference.negated()).toFixed(2),
    messages: order.reviews.map((event) => ({ id: event.id, text: event.studentMessage!, createdAt: event.createdAt.toISOString() })) };
}

export async function orderCatalog(raw: unknown) {
  requirePaymentSales(); const { q } = orderCatalogSchema.parse(raw); await requirePaymentStudent();
  const rows = await prisma.paidAccessPlan.findMany({
    where: { id: { in: paymentLaunchPlanIds() }, isActive: true, ...paymentPlanWhere(), price: { gt: 0 }, currency: "SAR",
      OR: [{ title: { contains: q, mode: "insensitive" } }, { subject: { name: { contains: q, mode: "insensitive" } } }] },
    select: planSelect, take: 30, orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
  return rows.map(planItem);
}
export async function quoteOrder(raw: unknown) {
  requirePaymentSales(); const input = orderQuoteSchema.parse(raw); await requirePaymentStudent();
  return quote(await loadPlans(input.planIds, prisma));
}
async function ownedOrder(db: Db, userId: string, id: string) {
  const order = await db.paymentOrder.findFirst({ where: { id, userId }, include: includeOrder });
  if (!order) throw new OrderError("not_found", 404);
  return order;
}
async function expireOrder(db: Db, order: OrderRow) {
  await db.paymentOrder.update({ where: { id: order.id }, data: { status: "expired", activeCartKey: null,
    events: { create: { type: "expired" } } } });
}
export async function createOrder(raw: unknown) {
  requirePaymentSales(); const input = createOrderSchema.parse(raw); const user = await requirePaymentStudent();
  const ids = [...input.planIds].sort();
  const requestHash = hash({ ids, contactMethod: input.contactMethod, quoteVersion: input.quoteVersion });
  const cartKey = hash(ids);
  return paymentTransaction(async (tx) => {
    requirePaymentSales(); await lockPaymentUsers(tx, [user.id]); await recheckPaymentStudent(tx, user);
    const prior = await tx.paymentOrder.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } }, include: includeOrder });
    if (prior) {
      if (prior.requestHash !== requestHash) throw new OrderError("idempotency_key_reused");
      return { order: await serializeOrder(prior, tx), alreadyCreated: true };
    }
    await refreshPaymentAccount(tx, user.id);
    const active = await tx.paymentOrder.findUnique({ where: { userId_activeCartKey: { userId: user.id, activeCartKey: cartKey } }, include: includeOrder });
    if (active) {
      if (effectiveOrderStatus(active) !== "expired") throw new OrderError("active_order_exists", 409, active.id);
      await expireOrder(tx, active);
    }
    const plans = await loadPlans(ids, tx); const currentQuote = quote(plans);
    const subjects = plans.map((plan) => plan.subjectId!);
    if (await tx.accessEntitlement.findFirst({ where: liveSubjectGrantWhere(user.id, subjects), select: { id: true } })) throw new OrderError("active_entitlement_exists");
    const overlap = await tx.paymentOrder.findFirst({ where: openSubjectOrderWhere(user.id, subjects), select: { id: true } });
    if (overlap) throw new OrderError("active_order_exists", 409, overlap.id);
    if (currentQuote.version !== input.quoteVersion) throw new OrderError("quote_changed");
    const contactValue = commonDestination(plans, input.contactMethod);
    if (!contactValue) throw new OrderError("contact_unavailable");
    const now = new Date();
    const order = await tx.paymentOrder.create({ data: {
      reference: `MW-${now.toISOString().slice(2, 7).replace("-", "")}-${randomBytes(5).toString("hex").toUpperCase()}`,
      userId: user.id, idempotencyKey: input.idempotencyKey, requestHash, cartKey, activeCartKey: cartKey,
      total: new Prisma.Decimal(currentQuote.total), itemCount: plans.length, currency: "SAR",
      contactMethod: input.contactMethod, contactValue, status: "pending_payment",
      createdAt: now, expiresAt: new Date(now.getTime() + QUOTE_HOURS * 3600000),
      items: { create: currentQuote.items }, events: { create: { type: "created", actorId: user.id } },
    }, include: includeOrder });
    return { order: await serializeOrder(order, tx), alreadyCreated: false };
  });
}
export async function getOrder(id: string) {
  const user = await requirePaymentStudent(); orderIdSchema.parse(id);
  return prisma.$transaction(async (tx) => serializeOrder(await ownedOrder(tx, user.id, id), tx),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function listOrders(raw: unknown) {
  const user = await requirePaymentStudent(); const { cursor } = orderListSchema.parse(raw);
  let after: { createdAt: string; id: string } | null = null;
  if (cursor) {
    try { after = orderCursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))); }
    catch { throw new OrderError("invalid_cursor", 400); }
  }
  return prisma.$transaction(async (tx) => {
    const rows = await tx.paymentOrder.findMany({ where: { userId: user.id,
      ...(after ? { OR: [{ createdAt: { lt: new Date(after.createdAt) } }, { createdAt: new Date(after.createdAt), id: { lt: after.id } }] } : {}) },
      include: includeOrder, take: 21, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    const page = rows.slice(0, 20); const last = page.at(-1);
    return { items: await Promise.all(page.map((row) => serializeOrder(row, tx))), nextCursor: rows.length > 20 && last
      ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt.toISOString() })).toString("base64url") : null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function cancelOrder(id: string) {
  orderIdSchema.parse(id); const user = await requirePaymentStudent();
  return paymentTransaction(async (tx) => {
    await lockPaymentUsers(tx, [user.id]); await recheckPaymentStudent(tx, user); const order = await ownedOrder(tx, user.id, id);
    if (order.status === "cancelled") return serializeOrder(order, tx);
    if (effectiveOrderStatus(order) !== "pending_payment" || order._count.ledger) throw new OrderError("order_not_cancellable");
    return serializeOrder(await tx.paymentOrder.update({ where: { id }, data: { status: "cancelled", activeCartKey: null,
      events: { create: { type: "cancelled", actorId: user.id } } }, include: includeOrder }), tx);
  });
}
export async function contactOrder(id: string) {
  requirePaymentReview(); orderIdSchema.parse(id); const user = await requirePaymentStudent();
  return paymentTransaction(async (tx) => {
    requirePaymentReview(); await lockPaymentUsers(tx, [user.id]); await recheckPaymentStudent(tx, user); const order = await ownedOrder(tx, user.id, id);
    if (!["pending_payment", "pending_review", "awaiting_additional_payment"].includes(effectiveOrderStatus(order))) throw new OrderError("order_not_payable");
    // A changed price does not change a saved quote; a removed or changed recipient stops handoff.
    const plans = await tx.paidAccessPlan.findMany({ where: { id: { in: order.items.map((i) => i.planId) }, isActive: true, ...paymentPlanWhere() }, select: planSelect });
    if (plans.length !== order.items.length || commonDestination(plans, order.contactMethod) !== order.contactValue) throw new OrderError("contact_changed");
    if (!order.contactRequestedAt) await tx.paymentOrder.update({ where: { id }, data: { contactRequestedAt: new Date(),
      events: { create: { type: "contact_requested", actorId: user.id } } } });
    const message = ["طلب اشتراك مواد", `رقم الطلب: ${order.reference}`,
      ...order.items.map((item) => `${item.subjectName.slice(0, 160)}: ${item.price.toFixed(2)} SAR`),
      `الإجمالي: ${order.total.toFixed(2)} SAR`,
      ...(order.status === "pending_payment" ? [`صلاحية الطلب (بتوقيت الرياض): ${order.expiresAt.toLocaleString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" })}`] : ["الطلب قيد المراجعة"])].join("\n");
    return { method: order.contactMethod, message, href: order.contactMethod === "whatsapp"
      ? `https://wa.me/${order.contactValue}?text=${encodeURIComponent(message)}` : `https://t.me/${order.contactValue}` };
  });
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "../payments/fixtures.mjs";
const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
function loadFor(id) {
  const current = async () => id ? prisma.user.findUnique({ where: { id } }) : null;
  return moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": { getCurrentUser: current },
    "next/cache": { unstable_cache: (fn) => fn },
    "@/lib/server/storage": { createPresignedGetUrl: async () => "https://private.example.test/r1-signed" },
    "@/lib/auth": { authOptions: {} }, "next-auth": { getServerSession: async () => { const user = await current(); return user ? { user } : null; } } });
}
const admin = loadFor("legacy-admin"); const reviews = admin("src/lib/server/payment-reviews.ts");
const planIds = [randomUUID(), randomUUID()];
const selectPlans = (ids) => { process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify(ids); };
let count = 0;
async function check(name, fn) { await fn(); console.log(`PASS R1 ${++count}: ${name}`); }
async function student() {
  const id = randomUUID(); const email = `${id}@r1.example.test`;
  await prisma.user.create({ data: { id, email, normalizedEmail: email, password: "test-only-unused-hash", role: "student", emailVerified: new Date() } });
  const load = loadFor(id);
  return { id, load, orders: load("src/lib/server/payment-orders.ts"), review: load("src/lib/server/payment-reviews.ts"), access: load("src/lib/server/access-control.ts") };
}
async function input(customer, ids = [planIds[0]]) {
  return { planIds: ids, quoteVersion: (await customer.orders.quoteOrder({ planIds: ids })).version, contactMethod: "whatsapp", idempotencyKey: randomUUID() };
}
async function act(orderId, action, fields = {}) {
  const row = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: orderId } });
  return reviews.reviewOrder(orderId, { action, expectedVersion: row.reviewVersion, idempotencyKey: randomUUID(), internalNote: "R1 isolated release verification", ...fields });
}
try {
  process.env.PAYMENT_V1_ENABLED = "true"; process.env.PAYMENT_REVIEW_ENABLED = "true"; process.env.PAYMENT_CODES_ENABLED = "false";
  for (let i = 0; i < 2; i++) await prisma.paidAccessPlan.create({ data: { id: planIds[i], title: `R1 plan ${i}`, scopeType: "subject", subjectId: i ? f.sa2 : f.sa,
    price: "100", currency: "SAR", defaultDurationDays: 30, isActive: true, whatsappNumber: "966500000000", telegramUsername: "paymenttest" } });
  selectPlans([planIds[0]]);
  const buyer = await student(); const other = await student();
  await check("only approved plans can be quoted or sold, including direct and mixed-cart attempts", async () => {
    assert.deepEqual((await buyer.orders.orderCatalog({})).map((p) => p.planId), [planIds[0]]);
    const body = await input(buyer);
    const before = await prisma.paymentOrder.count();
    await assert.rejects(buyer.orders.quoteOrder({ planIds }), /plan_not_in_launch/);
    await assert.rejects(buyer.orders.createOrder({ ...body, planIds }), /plan_not_in_launch/);
    assert.equal(await prisma.paymentOrder.count(), before);
    selectPlans([planIds[0], f.yePlan, f.academyPlan, f.majorPlan]);
    for (const id of [f.yePlan, f.academyPlan, f.majorPlan]) await assert.rejects(buyer.orders.quoteOrder({ planIds: [id] }), /payment_scope_not_allowed/);
    selectPlans([planIds[0]]);
  });
  await check("removing a plan after quote blocks a new order; empty or invalid launch configuration opens no sales", async () => {
    const body = await input(buyer); selectPlans([planIds[1]]);
    await assert.rejects(buyer.orders.createOrder(body), /plan_not_in_launch/);
    for (const value of ["[]", "not-json", '["valid",null]']) {
      process.env.PAYMENT_LAUNCH_PLAN_IDS = value;
      await assert.rejects(buyer.orders.createOrder(body), /payments_unavailable/);
    }
    selectPlans([planIds[0]]);
  });
  const saved = (await buyer.orders.createOrder(await input(buyer))).order;
  await check("sales pause and launch-list removal preserve contact, review and Admin approval of an existing order", async () => {
    process.env.PAYMENT_V1_ENABLED = "false"; selectPlans([]);
    const view = await buyer.orders.getOrder(saved.id); assert.equal(view.canContact, true); assert.equal(view.canSubmitReview, true);
    assert.ok((await buyer.orders.contactOrder(saved.id)).message.includes(saved.reference));
    await buyer.review.submitOrderReview(saved.id, { expectedVersion: 0, idempotencyKey: randomUUID() });
    await act(saved.id, "receipt", { amount: "100", reference: `r1/${randomUUID()}` });
    await act(saved.id, "approved");
    assert.equal(await prisma.accessEntitlement.count({ where: { orderItem: { orderId: saved.id } } }), 1);
    assert.equal((await reviews.getAdminOrder(saved.id)).reviewEnabled, true);
  });
  await check("all write switches may be closed without revoking access; another account and unpublished content remain denied", async () => {
    process.env.PAYMENT_REVIEW_ENABLED = "false";
    for (const quizId of [f.paid, f.inherited]) assert.equal((await buyer.access.checkQuizAccess({ quizId })).reason, "entitled");
    assert.equal((await buyer.access.checkStudySummaryAccess({ summaryId: f.saSummary })).allowed, true);
    await prisma.attachment.update({ where: { id: `pdf-${f.saSummary}` }, data: { storageProvider: "r2", visibility: "private", bucket: "test", storageKey: "test.pdf" } });
    const request = new Request(`${process.env.NEXTAUTH_URL}/api/v1/student/summaries/${f.saSummary}/pdf`);
    const params = { params: Promise.resolve({ id: f.saSummary }) };
    assert.equal((await buyer.load("src/app/api/v1/student/summaries/[id]/pdf/route.ts").GET(request, params)).status, 302);
    assert.equal((await other.load("src/app/api/v1/student/summaries/[id]/pdf/route.ts").GET(request, params)).status, 403);
    assert.ok((await buyer.load("src/lib/server/study-summaries.ts").getPublishedStudySummaryContent(f.saSummary)).contentHtml);
    assert.equal(await other.load("src/lib/server/study-summaries.ts").getPublishedStudySummaryContent(f.saSummary), null);
    assert.equal((await other.access.checkQuizAccess({ quizId: f.paid })).allowed, false);
    assert.equal((await loadFor(null)("src/lib/server/access-control.ts").checkQuizAccess({ quizId: f.paid })).reason, "student_signin_required");
    for (const summaryId of [f.draft, f.future]) assert.equal((await buyer.access.checkStudySummaryAccess({ summaryId })).allowed, false);
    assert.equal((await buyer.orders.listOrders({})).items.some((o) => o.id === saved.id), true);
    assert.equal((await reviews.getAdminOrder(saved.id)).reviewEnabled, false);
  });
  await check("review pause rejects every new financial action and student submission without disabling history or cancellation", async () => {
    process.env.PAYMENT_V1_ENABLED = "true"; selectPlans([planIds[0]]);
    const order = (await other.orders.createOrder(await input(other))).order;
    const row = await other.orders.getOrder(order.id); assert.equal(row.canContact, false); assert.equal(row.canSubmitReview, false);
    const before = await prisma.paymentReviewEvent.count();
    await assert.rejects(other.orders.contactOrder(order.id), /payment_review_unavailable/);
    await assert.rejects(other.review.submitOrderReview(order.id, { expectedVersion: 0, idempotencyKey: randomUUID() }), /payment_review_unavailable/);
    await assert.rejects(act(order.id, "receipt", { amount: "100", reference: `r1/${randomUUID()}` }), /payment_review_unavailable/);
    assert.equal(await prisma.paymentReviewEvent.count(), before);
    assert.equal((await other.orders.cancelOrder(order.id)).status, "cancelled");
    await assert.rejects(admin("src/lib/server/payment-admin.ts").issuePaymentCode("legacy-admin", {}), /payment_codes_unavailable/);
    await assert.rejects(other.load("src/lib/server/payment-mutations.ts").redeemSubscriptionCode({}), /payment_codes_unavailable/);
  });
  await check("revoked access is not restored by pausing sales or changing the launch list", async () => {
    const grant = await prisma.accessEntitlement.findFirstOrThrow({ where: { orderItem: { orderId: saved.id } } });
    await admin("src/lib/server/payment-admin.ts").revokePaymentEntitlement(grant.id, { reason: "R1 access revocation test", expectedUpdatedAt: grant.updatedAt.toISOString() });
    process.env.PAYMENT_V1_ENABLED = "false"; selectPlans([]);
    assert.equal((await buyer.access.checkQuizAccess({ quizId: f.paid })).allowed, false);
    for (const quizId of [f.yeQuiz, f.academyQuiz, f.free, f.preview]) assert.equal((await buyer.access.checkQuizAccess({ quizId })).allowed, true);
  });
  console.log(`${count} R1 PostgreSQL/service acceptance groups passed`);
} finally { await prisma.$disconnect(); }

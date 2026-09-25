import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "../payments/fixtures.mjs";
const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
function forActor(id, client = prisma, current) {
  return moduleLoader({ "@/lib/prisma": { prisma: client }, "@/lib/auth-helpers": { getCurrentUser: current ?? (async () => id ? client.user.findUnique({ where: { id } }) : null) },
    "next/cache": { unstable_cache: (fn) => fn } });
}
const adminId = randomUUID(), studentId = randomUUID();
const load = forActor(adminId); const admin = load("src/lib/server/payment-admin.ts");
const buyer = forActor(studentId); const orders = buyer("src/lib/server/payment-orders.ts");
let count = 0;
const check = async (name, fn) => { await fn(); console.log(`PASS R2 ${++count}: ${name}`); };
const meta = (row, reason = "R2 isolated security review") => ({ reason, expectedUpdatedAt: row.updatedAt.toISOString() });
const planInput = { scopeType: "subject", subjectId: f.sa, title: "R2 test plan", description: null, price: "100", currency: "SAR", isActive: true,
  whatsappNumber: "966500000000", telegramUsername: null, contactMessage: null, defaultDurationDays: 30, defaultMaxUses: 1 };
const grant = () => prisma.accessEntitlement.create({ data: { userId: studentId, subjectId: f.sa, scopeType: "subject" } });
const codeInput = (planId) => ({ planId, idempotencyKey: randomUUID(), maxUses: 1, durationDays: 30, startsAt: null, expiresAt: null, note: null });
try {
  for (const [id, role] of [[adminId, "admin"], [studentId, "student"]]) {
    const email = `${id}@r2.example.test`;
    await prisma.user.create({ data: { id, email, normalizedEmail: email, password: "isolated-unused-password-hash", role, isActive: true, emailVerified: new Date() } });
  }
  process.env.PAYMENT_V1_ENABLED = "true"; process.env.PAYMENT_REVIEW_ENABLED = "true"; process.env.PAYMENT_CODES_ENABLED = "false";
  let plan;
  await check("plan writes authenticate the session, preserve audited before/after and reject stale updates", async () => {
    const before = await prisma.paymentAdminEvent.count();
    plan = await admin.savePaymentPlan(planInput, { reason: "R2 approved test plan" });
    assert.equal(await prisma.paymentAdminEvent.count(), before + 1);
    const event = await prisma.paymentAdminEvent.findFirstOrThrow({ where: { planId: plan.id } });
    assert.equal(event.actorId, adminId); assert.equal(event.after.price, "100"); assert.deepEqual(event.before, {});
    const outcomes = await Promise.allSettled([
      admin.savePaymentPlan({ ...planInput, title: "First edit" }, meta(plan), plan.id),
      forActor(adminId, second)("src/lib/server/payment-admin.ts").savePaymentPlan({ ...planInput, title: "Second edit" }, meta(plan), plan.id),
    ]);
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
    assert.match(outcomes.find((r) => r.status === "rejected").reason.message, /payment_target_changed/);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { planId: plan.id } }), 2);
    plan = await prisma.paidAccessPlan.findUniqueOrThrow({ where: { id: plan.id } });
    await assert.rejects(admin.savePaymentPlan({ ...planInput, isActive: false }, meta(plan), plan.id), /payment_content_confirmation_required/);
    await assert.rejects(admin.disablePaymentPlan(plan.id, meta(plan)), /payment_content_confirmation_required/);
    assert.equal((await prisma.paidAccessPlan.findUniqueOrThrow({ where: { id: plan.id } })).isActive, true);
  });
  await check("non-admin callers and stale or disabled Admin sessions cannot mutate targets or audit", async () => {
    const target = await grant(); const before = await prisma.paymentAdminEvent.count();
    for (const actorId of [null, studentId, "legacy-editor", "legacy-moderator"]) {
      const service = forActor(actorId)("src/lib/server/payment-admin.ts");
      await assert.rejects(service.revokePaymentEntitlement(target.id, meta(target)), /unauthorized|forbidden/);
      await assert.rejects(service.disablePaymentPlan(plan.id, { ...meta(plan), confirmContentChange: true }), /unauthorized|forbidden/);
    }
    const stale = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    await prisma.user.update({ where: { id: adminId }, data: { sessionVersion: { increment: 1 } } });
    const staleAdmin = forActor(adminId, prisma, async () => stale)("src/lib/server/payment-admin.ts");
    await assert.rejects(staleAdmin.revokePaymentEntitlement(target.id, meta(target)), /forbidden/);
    await prisma.user.update({ where: { id: adminId }, data: { isActive: false } });
    await assert.rejects(staleAdmin.revokePaymentEntitlement(target.id, meta(target)), /forbidden/);
    await prisma.user.update({ where: { id: adminId }, data: { isActive: true } });
    assert.equal(await prisma.paymentAdminEvent.count(), before);
    assert.equal((await prisma.accessEntitlement.findUniqueOrThrow({ where: { id: target.id } })).isActive, true);
    await admin.revokePaymentEntitlement(target.id, meta(target));
  });
  await check("revocation requires a reason and commits once under concurrent duplicate requests while release flags are closed", async () => {
    process.env.PAYMENT_V1_ENABLED = "false"; process.env.PAYMENT_REVIEW_ENABLED = "false";
    const target = await grant();
    await assert.rejects(admin.revokePaymentEntitlement(target.id, { ...meta(target), reason: " " }));
    await assert.rejects(admin.revokePaymentEntitlement(target.id, { ...meta(target), actorId: studentId }));
    await assert.rejects(admin.revokePaymentEntitlement(target.id, { ...meta(target), expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }), /payment_target_changed/);
    const results = await Promise.all([admin, forActor(adminId, second)("src/lib/server/payment-admin.ts")].map((service) => service.revokePaymentEntitlement(target.id, meta(target))));
    assert.equal(results.filter((r) => !r.alreadyDisabled).length, 1);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { entitlementId: target.id } }), 1);
    const after = await prisma.accessEntitlement.findUniqueOrThrow({ where: { id: target.id } });
    assert.equal(after.isActive, false);
    for (const key of ["userId", "subjectId", "codeId", "orderItemId"]) assert.equal(after[key], target[key]);
    assert.equal(after.startsAt.getTime(), target.startsAt.getTime());
    const event = await prisma.paymentAdminEvent.findUniqueOrThrow({ where: { entitlementId: target.id } });
    assert.equal(event.before.isActive, true); assert.equal(event.after.isActive, false); assert.equal(event.reason, meta(target).reason);
    await assert.rejects(prisma.accessEntitlement.update({ where: { id: target.id }, data: { isActive: true } }));
  });
  await check("database rejects unaudited revocation and rolls back the entitlement when audit insertion fails", async () => {
    const target = await grant();
    await assert.rejects(prisma.accessEntitlement.update({ where: { id: target.id }, data: { isActive: false } }));
    await prisma.$executeRawUnsafe(`CREATE FUNCTION r2_fail_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated_audit_storage_failure'; END; $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER r2_fail_audit_test BEFORE INSERT ON payment_admin_events FOR EACH ROW EXECUTE FUNCTION r2_fail_audit_test()`);
    try { await assert.rejects(admin.revokePaymentEntitlement(target.id, meta(target))); }
    finally { await prisma.$executeRawUnsafe(`DROP TRIGGER r2_fail_audit_test ON payment_admin_events`); await prisma.$executeRawUnsafe(`DROP FUNCTION r2_fail_audit_test()`); }
    assert.equal((await prisma.accessEntitlement.findUniqueOrThrow({ where: { id: target.id } })).isActive, true);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { entitlementId: target.id } }), 0);
    await admin.revokePaymentEntitlement(target.id, meta(target));
  });
  await check("audit is append-only, rejects forged actor/version and prevents deleting referenced history", async () => {
    const event = await prisma.paymentAdminEvent.findFirstOrThrow({ where: { actorId: adminId } });
    await assert.rejects(prisma.paymentAdminEvent.update({ where: { id: event.id }, data: { reason: "Rewritten reason" } }));
    await assert.rejects(prisma.paymentAdminEvent.delete({ where: { id: event.id } }));
    for (const [actorId, actorSessionVersion] of [[studentId, 0], [adminId, -1]]) {
      await assert.rejects(prisma.paymentAdminEvent.create({ data: { actorId, actorSessionVersion, action: "plan_created", planId: plan.id, reason: "Forged audit insertion", before: {}, after: {} } }));
    }
    await assert.rejects(prisma.user.delete({ where: { id: adminId } }));
    assert.equal((await prisma.paymentAdminEvent.findUniqueOrThrow({ where: { id: event.id } })).reason, event.reason);
  });
  await check("codes stay closed by default; enabled test issuance/disable are audited without storing code or hash in audit", async () => {
    await assert.rejects(admin.issuePaymentCode(codeInput(plan.id), "R2 test issuance"), /payment_codes_unavailable/);
    process.env.PAYMENT_CODES_ENABLED = "true";
    process.env.PAYMENT_CODE_PLAN_IDS = JSON.stringify([plan.id]);
    const plainCode = (await admin.issuePaymentCode(codeInput(plan.id), "R2 test issuance")).plainCode;
    const code = await prisma.subscriptionCode.findFirstOrThrow({ where: { createdBy: adminId } });
    const redemption = await buyer("src/lib/server/payment-mutations.ts").redeemSubscriptionCode({ code: plainCode, subjectId: f.sa });
    process.env.PAYMENT_CODES_ENABLED = "false";
    await admin.disablePaymentCode(code.id, meta(await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: code.id } })));
    assert.equal((await buyer("src/lib/server/access-control.ts").checkQuizAccess({ quizId: f.paid })).allowed, true);
    const audit = await prisma.paymentAdminEvent.findMany({ where: { codeId: code.id } });
    assert.equal(audit.length, 2); assert.equal(JSON.stringify(audit).includes(plainCode), false); assert.equal(JSON.stringify(audit).includes(code.codeHash), false);
    await assert.rejects(prisma.subscriptionCode.update({ where: { id: code.id }, data: { isActive: true } }));
    const entitlement = await prisma.accessEntitlement.findUniqueOrThrow({ where: { id: redemption.entitlement.id } });
    await admin.revokePaymentEntitlement(entitlement.id, meta(entitlement));
  });
  await check("revoking an approved order grant does not rewrite order, money, approval or grant ownership and never leaks its internal reason", async () => {
    process.env.PAYMENT_V1_ENABLED = "true"; process.env.PAYMENT_REVIEW_ENABLED = "true"; process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([plan.id]);
    const quote = await orders.quoteOrder({ planIds: [plan.id] });
    const order = (await orders.createOrder({ planIds: [plan.id], quoteVersion: quote.version, contactMethod: "whatsapp", idempotencyKey: randomUUID() })).order;
    await buyer("src/lib/server/payment-reviews.ts").submitOrderReview(order.id, { expectedVersion: 0, idempotencyKey: randomUUID() });
    const review = load("src/lib/server/payment-reviews.ts");
    await review.reviewOrder(order.id, { action: "receipt", expectedVersion: 1, idempotencyKey: randomUUID(), internalNote: "R2 receipt verified", amount: "100", reference: `r2/${randomUUID()}` });
    await review.reviewOrder(order.id, { action: "approved", expectedVersion: 2, idempotencyKey: randomUUID(), internalNote: "R2 explicit approval" });
    const before = { order: await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } }), ledger: await prisma.paymentLedgerEntry.findMany({ where: { orderId: order.id } }), review: await prisma.paymentReviewEvent.findMany({ where: { orderId: order.id } }) };
    const entitlement = await prisma.accessEntitlement.findFirstOrThrow({ where: { orderItem: { orderId: order.id } } });
    process.env.PAYMENT_V1_ENABLED = "false"; process.env.PAYMENT_REVIEW_ENABLED = "false"; process.env.PAYMENT_LAUNCH_PLAN_IDS = "[]";
    await admin.revokePaymentEntitlement(entitlement.id, meta(entitlement, "PRIVATE R2 security incident details"));
    assert.deepEqual(await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } }), before.order);
    assert.deepEqual(await prisma.paymentLedgerEntry.findMany({ where: { orderId: order.id } }), before.ledger);
    assert.deepEqual(await prisma.paymentReviewEvent.findMany({ where: { orderId: order.id } }), before.review);
    assert.equal((await buyer("src/lib/server/access-control.ts").checkQuizAccess({ quizId: f.paid })).allowed, false);
    assert.equal(JSON.stringify(await orders.getOrder(order.id)).includes("PRIVATE R2"), false);
    assert.equal((await review.getAdminOrder(order.id)).grants[0].isActive, false);
  });
  await check("explicit plan deactivation records both sides without enabling sale or changing unrelated grants", async () => {
    plan = await prisma.paidAccessPlan.findUniqueOrThrow({ where: { id: plan.id } });
    const before = await prisma.accessEntitlement.count();
    await admin.disablePaymentPlan(plan.id, { ...meta(plan), confirmContentChange: true });
    assert.equal((await prisma.paidAccessPlan.findUniqueOrThrow({ where: { id: plan.id } })).isActive, false);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { planId: plan.id, action: "plan_disabled" } }), 1);
    assert.equal(await prisma.accessEntitlement.count(), before);
  });
  console.log(`${count} R2 PostgreSQL/service acceptance groups passed`);
} finally { await prisma.$disconnect(); await second.$disconnect(); }

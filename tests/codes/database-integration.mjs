import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "../payments/fixtures.mjs";

const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
const adminId = "legacy-admin";

function forUser(userId, client = prisma) {
  return moduleLoader({
    "@/lib/prisma": { prisma: client },
    "@/lib/auth-helpers": { getCurrentUser: () => client.user.findUnique({ where: { id: userId } }) },
    "next/cache": { unstable_cache: (fn) => fn },
  });
}

const admin = forUser(adminId)("src/lib/server/payment-admin.ts");
const secondAdmin = forUser(adminId, second)("src/lib/server/payment-admin.ts");
const reason = "Activation code hardening acceptance";
const input = (overrides = {}) => ({
  planId: f.plan,
  idempotencyKey: randomUUID(),
  maxUses: 1,
  durationDays: 7,
  startsAt: null,
  expiresAt: null,
  note: "Local acceptance only",
  ...overrides,
});
const issue = async (overrides = {}, service = admin) => service.issuePaymentCode(input(overrides), reason);
const redeemAs = (userId, code, subjectId = f.sa) => forUser(userId)("src/lib/server/payment-mutations.ts").redeemSubscriptionCode({ code, subjectId });
async function student(label) {
  const id = randomUUID(); const email = `${label}-${id}@codes.example.test`;
  await prisma.user.create({ data: { id, email, normalizedEmail: email, password: "unused-test-hash", role: "student", isActive: true, emailVerified: new Date() } });
  return id;
}
let count = 0;
async function check(name, work) { await work(); console.log(`PASS codes ${++count}: ${name}`); }

try {
  process.env.PAYMENT_CODES_ENABLED = "true";
  process.env.PAYMENT_CODE_PLAN_IDS = JSON.stringify([f.plan]);
  process.env.PAYMENT_LAUNCH_PLAN_IDS = "[]";
  await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { defaultDurationDays: 5, defaultMaxUses: 1 } });

  await check("issuance stores only a hash and one audited idempotent result", async () => {
    const request = input();
    const [first, retry] = await Promise.all([admin.issuePaymentCode(request, reason), secondAdmin.issuePaymentCode(request, reason)]);
    const created = [first, retry].find((result) => !result.alreadyIssued);
    const repeated = [first, retry].find((result) => result.alreadyIssued);
    assert.ok(created?.plainCode); assert.equal(repeated?.plainCode, null); assert.equal(created.codeId, repeated.codeId);
    const row = await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: created.codeId } });
    assert.notEqual(row.codeHash, created.plainCode); assert.equal(row.issuanceIdempotencyKey, request.idempotencyKey);
    assert.equal(await prisma.subscriptionCode.count({ where: { createdBy: adminId, issuanceIdempotencyKey: request.idempotencyKey } }), 1);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { codeId: row.id, action: "code_issued" } }), 1);
    assert.equal(JSON.stringify(await prisma.paymentAdminEvent.findMany({ where: { codeId: row.id } })).includes(created.plainCode), false);
    await assert.rejects(admin.issuePaymentCode({ ...request, durationDays: 8 }, reason), /payment_idempotency_conflict/);
  });

  await check("successful redemption creates one finite entitlement and one immutable audit event", async () => {
    const userId = await student("success"); const issued = await issue({ durationDays: 3 });
    const result = await redeemAs(userId, issued.plainCode);
    assert.equal(result.alreadyRedeemed, false);
    assert.equal(result.entitlement.expiresAt - result.entitlement.startsAt, 3 * 86400000);
    const event = await prisma.paymentCodeRedemptionEvent.findUniqueOrThrow({ where: { entitlementId: result.entitlement.id } });
    assert.deepEqual({ userId: event.userId, codeId: event.codeId, planId: event.planId, subjectId: event.subjectId, usageNumber: event.usageNumber },
      { userId, codeId: result.entitlement.codeId, planId: f.plan, subjectId: f.sa, usageNumber: 1 });
    const retry = await redeemAs(userId, issued.plainCode);
    assert.equal(retry.alreadyRedeemed, true); assert.equal(retry.entitlement.id, result.entitlement.id);
    assert.equal(await prisma.paymentCodeRedemptionEvent.count({ where: { entitlementId: result.entitlement.id } }), 1);
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: event.codeId } })).usedCount, 1);
    await assert.rejects(prisma.paymentCodeRedemptionEvent.create({ data: {
      userId, codeId: event.codeId, planId: event.planId, subjectId: event.subjectId,
      entitlementId: event.entitlementId, usageNumber: event.usageNumber,
    } }));
    await assert.rejects(prisma.paymentCodeRedemptionEvent.update({ where: { id: event.id }, data: { usageNumber: 2 } }));
    await assert.rejects(prisma.paymentCodeRedemptionEvent.delete({ where: { id: event.id } }));
  });

  await check("two students racing for maxUses=1 produce one grant and one audit", async () => {
    const [one, two] = await Promise.all([student("race-a"), student("race-b")]);
    const issued = await issue();
    const results = await Promise.allSettled([redeemAs(one, issued.plainCode), redeemAs(two, issued.plainCode)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.match(results.find((result) => result.status === "rejected").reason.message, /code_used/);
    assert.equal(await prisma.paymentCodeRedemptionEvent.count({ where: { codeId: issued.codeId } }), 1);
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.codeId } })).usedCount, 1);
  });

  await check("invalid windows, disabled and exhausted codes never create a successful audit", async () => {
    const userId = await student("windows");
    const future = await issue({ startsAt: new Date(Date.now() + 3600000) });
    await assert.rejects(redeemAs(userId, future.plainCode), /code_not_started/);
    const expired = await issue({ expiresAt: new Date(Date.now() - 1000) });
    await assert.rejects(redeemAs(userId, expired.plainCode), /code_expired/);
    const disabled = await issue();
    const row = await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: disabled.codeId } });
    await admin.disablePaymentCode(row.id, { reason, expectedUpdatedAt: row.updatedAt.toISOString() });
    await assert.rejects(redeemAs(userId, disabled.plainCode), /inactive_code/);
    assert.equal(await prisma.paymentCodeRedemptionEvent.count({ where: { codeId: { in: [future.codeId, expired.codeId, disabled.codeId] } } }), 0);
  });

  await check("code allowlist is enforced independently for issuance and redemption", async () => {
    const secondPlan = await prisma.paidAccessPlan.create({ data: { scopeType: "subject", subjectId: f.sa, title: "Codes second plan", price: "1", currency: "SAR", isActive: true, defaultDurationDays: 2, defaultMaxUses: 1 } });
    await assert.rejects(issue({ planId: secondPlan.id }), /code_plan_not_enabled/);
    process.env.PAYMENT_CODE_PLAN_IDS = JSON.stringify([f.plan, secondPlan.id]);
    const issued = await issue({ planId: secondPlan.id });
    process.env.PAYMENT_CODE_PLAN_IDS = JSON.stringify([f.plan]);
    const userId = await student("removed-plan");
    await assert.rejects(redeemAs(userId, issued.plainCode), /code_plan_not_enabled/);
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.codeId } })).usedCount, 0);
    assert.equal(await prisma.paymentCodeRedemptionEvent.count({ where: { codeId: issued.codeId } }), 0);
  });

  await check("closed global switch blocks issuance and redemption but leaves existing access active", async () => {
    const userId = await student("closed"); const issued = await issue(); const redeemed = await redeemAs(userId, issued.plainCode);
    process.env.PAYMENT_CODES_ENABLED = "false";
    await assert.rejects(issue(), /payment_codes_unavailable/);
    await assert.rejects(redeemAs(await student("closed-other"), issued.plainCode), /payment_codes_unavailable/);
    const access = await forUser(userId)("src/lib/server/access-control.ts").checkQuizAccess({ quizId: f.paid });
    assert.equal(access.allowed, true); assert.equal(access.entitlementId, redeemed.entitlement.id); assert.equal(access.canRedeemCode, false);
    process.env.PAYMENT_CODES_ENABLED = "true";
  });

  await check("an active entitlement rejects a different code without consuming it", async () => {
    const userId = await student("active");
    await prisma.accessEntitlement.create({ data: { userId, scopeType: "subject", subjectId: f.sa, startsAt: new Date(), expiresAt: new Date(Date.now() + 86400000), isActive: true } });
    const issued = await issue();
    await assert.rejects(redeemAs(userId, issued.plainCode), /active_entitlement_exists/);
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.codeId } })).usedCount, 0);
    assert.equal(await prisma.accessEntitlement.count({ where: { userId, codeId: issued.codeId } }), 0);
    assert.equal(await prisma.paymentCodeRedemptionEvent.count({ where: { codeId: issued.codeId } }), 0);
  });

  await check("duration falls back to the plan and missing duration fails closed at issuance and redemption", async () => {
    const fallbackUser = await student("fallback"); const fallback = await issue({ durationDays: null });
    const redeemed = await redeemAs(fallbackUser, fallback.plainCode);
    assert.equal(redeemed.entitlement.expiresAt - redeemed.entitlement.startsAt, 5 * 86400000);
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { defaultDurationDays: null } });
    await assert.rejects(issue({ durationDays: null }), /invalid_code_window/);
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { defaultDurationDays: 5 } });
    const laterMissing = await issue({ durationDays: null });
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { defaultDurationDays: null } });
    await assert.rejects(redeemAs(await student("missing-later"), laterMissing.plainCode), /invalid_code_window/);
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: laterMissing.codeId } })).usedCount, 0);
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { defaultDurationDays: 5 } });
  });

  await check("database rejects unaudited usage, permanent code grants and duplicate redemption history", async () => {
    const issued = await issue();
    await assert.rejects(prisma.subscriptionCode.update({ where: { id: issued.codeId }, data: { usedCount: { increment: 1 } } }));
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.codeId } })).usedCount, 0);
    const userId = await student("direct");
    await assert.rejects(prisma.accessEntitlement.create({ data: { userId, codeId: issued.codeId, scopeType: "subject", subjectId: f.sa, startsAt: new Date(), expiresAt: null } }));
    assert.equal(await prisma.accessEntitlement.count({ where: { userId, codeId: issued.codeId } }), 0);
  });

  console.log(`${count} activation-code PostgreSQL/service acceptance groups passed`);
} finally {
  await prisma.$disconnect();
  await second.$disconnect();
}

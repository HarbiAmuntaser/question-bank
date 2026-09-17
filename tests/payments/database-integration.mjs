import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "./fixtures.mjs";
const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/p2_test");
const queries = [];
const prisma = new PrismaClient({ datasourceUrl: url.href, log: [{ emit: "event", level: "query" }] });
prisma.$on("query", (event) => queries.push(event.query));
let actorId = f.alice;
function forUser(getId) {
  return moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": { getCurrentUser: async () => {
    const userId = getId(); return userId ? prisma.user.findUnique({ where: { id: userId } }) : null;
  } }, "next/cache": { unstable_cache: (fn) => fn },
    "@/lib/server/storage": { createPresignedGetUrl: async () => "https://private.example.test/short-lived-signature" } });
}
const load = forUser(() => actorId);
const access = load("src/lib/server/access-control.ts");
const mutations = load("src/lib/server/payment-mutations.ts");
const admin = forUser(() => "legacy-admin")("src/lib/server/payment-admin.ts");
const http = load("src/lib/server/payment-http.ts");
const origin = process.env.NEXTAUTH_URL;
const issue = (options = {}) => admin.issuePaymentCode({ planId: f.plan, maxUses: 1, durationDays: 30, startsAt: null, expiresAt: null, note: null, ...options }, "P3 isolated test issuance");
let count = 0;
async function check(name, test) { await test(); console.log(`PASS P3 ${++count}: ${name}`); }
function request(action, data, headers = {}) {
  return new Request(`${origin}/api/v1/student/access/${action}`, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(data) });
}
try {
  process.env.PAYMENT_V1_ENABLED = "false";
  process.env.PAYMENT_CODES_ENABLED = "false";
  await check("closed payment release denies paid SA content and all public mutations", async () => {
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).reason, "payments_unavailable");
    assert.equal((await access.checkQuizAccess({ quizId: f.free })).allowed, true);
    assert.equal((await access.checkQuizAccess({ quizId: f.preview })).allowed, true);
    assert.equal((await access.checkScopeAccess({ subjectId: f.sa2, majorId: `m-${f.sa}` })).reason, "no_paid_plan");
    queries.length = 0;
    assert.equal((await http.paymentPost(request("redeem", {}))).status, 503);
    assert.equal(queries.length, 0);
  });
  process.env.PAYMENT_V1_ENABLED = "true";
  process.env.PAYMENT_CODES_ENABLED = "true";
  process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([f.plan]);
  await check("outside scope skips every account/plan/entitlement query and metadata advertises free access", async () => {
    queries.length = 0;
    for (const quizId of [f.yeQuiz, f.academyQuiz]) assert.equal((await access.checkQuizAccess({ quizId })).reason, "out_of_scope");
    for (const summaryId of [f.yeSummary, f.academySummary]) assert.equal((await access.checkStudySummaryAccess({ summaryId })).reason, "out_of_scope");
    assert.equal(queries.some((q) => /\b(users|paid_access_plans|access_entitlements|anonymous_sessions)\b/.test(q)), false);
    const outside = await load("src/lib/server/payment-public-metadata.ts").outOfPaymentQuizIds([f.yeQuiz, f.academyQuiz, f.mixed, f.paid]);
    assert.deepEqual([...outside].sort(), [f.yeQuiz, f.academyQuiz].sort());
    const summaries = await load("src/lib/server/study-summaries.ts").getPublishedSubjectSummaries(f.ye);
    assert.ok(summaries.length > 0); assert.ok(summaries.every((s) => s.accessType === "free"));
  });
  await check("publication and single-subject ownership precede free/paid checks", async () => {
    for (const summaryId of [f.draft, f.future]) assert.equal((await access.checkStudySummaryAccess({ summaryId })).reason, "not_found");
    assert.equal((await access.checkQuizAccess({ quizId: f.hiddenQuiz })).reason, "not_found");
    assert.equal((await access.checkQuizAccess({ quizId: f.mixed })).reason, "missing_context");
    assert.equal((await access.checkQuizAccess({ quizId: f.missing })).reason, "missing_context");
    assert.equal((await access.checkQuizAccess({ quizId: f.fallback })).subjectId, f.sa);
    const metadata = load("src/lib/server/public-quizzes.ts");
    assert.equal(await metadata.getPublicQuizPreviewById(f.hiddenQuiz), null);
    assert.equal(await metadata.getPublicQuizzesBySubject(f.hidden), null);
  });
  await check("R3 removed anonymous payment ownership and retired codes", async () => {
    assert.equal(await prisma.accessEntitlement.findUnique({ where: { id: f.legacyEntitlement } }), null);
    assert.equal(await prisma.subscriptionCode.findUnique({ where: { id: f.legacyCode } }), null);
    await assert.rejects(mutations.redeemSubscriptionCode({ code: "QB-OLD-CODE", subjectId: f.sa }), /invalid_code/);
  });
  await check("database constraints reject non-SA-university grants and plans", async () => {
    for (const subjectId of [f.ye, f.academy, f.hidden]) {
      await assert.rejects(prisma.accessEntitlement.create({ data: { userId: f.alice, scopeType: "subject", subjectId } }));
    }
    await assert.rejects(prisma.paidAccessPlan.create({ data: { title: "YE", scopeType: "subject", subjectId: f.ye, price: "1" } }));
    await assert.rejects(prisma.paidAccessPlan.create({ data: { title: "Major", scopeType: "major", majorId: `m-${f.sa}`, price: "1" } }));
    await assert.rejects(prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { subjectId: f.sa2 } }));
  });
  await check("server mutations derive scope from plan/subject and require a verified student", async () => {
    for (const planId of [f.yePlan, f.academyPlan, f.majorPlan]) await assert.rejects(issue({ planId }), /payment_scope_not_allowed/);
    actorId = f.alice;
    await assert.rejects(load("src/lib/server/payment-admin.ts").issuePaymentCode({ planId: f.plan, maxUses: 1, durationDays: 1, startsAt: null, expiresAt: null, note: null }, "Denied student issuance"), /forbidden/);
  });
  let code;
  await check("concurrent repeats redeem one code once for the same account", async () => {
    code = await issue();
    const results = await Promise.all(Array.from({ length: 5 }, () => mutations.redeemSubscriptionCode({ code, subjectId: f.sa })));
    assert.equal(new Set(results.map((r) => r.entitlement.id)).size, 1);
    assert.equal(results.filter((r) => !r.alreadyRedeemed).length, 1);
    const codeId = results[0].entitlement.codeId;
    assert.equal((await prisma.subscriptionCode.findUnique({ where: { id: codeId } })).usedCount, 1);
    assert.equal(results[0].entitlement.userId, f.alice);
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).reason, "entitled");
    const bob = forUser(() => f.bob)("src/lib/server/access-control.ts");
    assert.equal((await bob.checkQuizAccess({ quizId: f.paid })).allowed, false);
  });
  await check("two accounts racing for a single-use code cannot both receive access", async () => {
    const single = await issue();
    const alice = forUser(() => f.alice)("src/lib/server/payment-mutations.ts");
    const bob = forUser(() => f.bob)("src/lib/server/payment-mutations.ts");
    const results = await Promise.allSettled([alice, bob].map((service) => service.redeemSubscriptionCode({ code: single, subjectId: f.sa })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  });
  await check("code windows and wrong subject IDs cannot grant access or consume uses", async () => {
    const future = await issue({ startsAt: new Date(Date.now() + 86400000) });
    await assert.rejects(mutations.redeemSubscriptionCode({ code: future, subjectId: f.sa }), /code_not_started/);
    const expired = await issue({ expiresAt: new Date(0) });
    await assert.rejects(mutations.redeemSubscriptionCode({ code: expired, subjectId: f.sa }), /code_expired/);
    const other = await issue();
    await assert.rejects(mutations.redeemSubscriptionCode({ code: other, subjectId: f.sa2 }), /payment_target_mismatch/);
    await assert.rejects(mutations.redeemSubscriptionCode({ code: other, subjectId: f.sa, quizId: f.yeQuiz }), /payment_target_mismatch/);
  });
  await check("HTML and private PDF delivery enforce the same entitlement after R3 cleanup", async () => {
    const content = load("src/lib/server/study-summaries.ts");
    assert.ok((await content.getPublishedStudySummaryContent(f.saSummary)).contentHtml);
    const pdf = load("src/app/api/v1/student/summaries/[id]/pdf/route.ts");
    const req = new Request(`${origin}/api/v1/student/summaries/${f.saSummary}/pdf`);
    const params = { params: Promise.resolve({ id: f.saSummary }) };
    assert.equal((await pdf.GET(req, params)).status, 302);
    actorId = f.unverified;
    assert.equal(await content.getPublishedStudySummaryContent(f.saSummary), null);
    assert.equal((await pdf.GET(req, params)).status, 403);
    assert.equal(await content.getPublishedStudySummaryContent(f.draft), null);
    actorId = f.alice;
  });
  await check("expiry, deactivation and account disable immediately remove access; repeat redemption is not renewal", async () => {
    await prisma.accessEntitlement.updateMany({ where: { userId: f.alice }, data: { startsAt: new Date(0), expiresAt: new Date(1) } });
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).allowed, false);
    assert.equal((await mutations.redeemSubscriptionCode({ code, subjectId: f.sa })).alreadyRedeemed, true);
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).allowed, false);
    const grant = await prisma.accessEntitlement.create({ data: { userId: f.alice, subjectId: f.sa, scopeType: "subject" } });
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).allowed, true);
    await prisma.user.update({ where: { id: f.alice }, data: { isActive: false } });
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).allowed, false);
    await prisma.user.update({ where: { id: f.alice }, data: { isActive: true } });
    await admin.revokePaymentEntitlement(grant.id, { reason: "P3 revoke access test", expectedUpdatedAt: grant.updatedAt.toISOString() });
    assert.equal((await access.checkQuizAccess({ quizId: f.paid })).allowed, false);
    await assert.rejects(prisma.user.delete({ where: { id: f.alice } }), (error) => error.code === "P2003");
    await assert.rejects(load("src/lib/server/admin-users.ts").deleteManagedUser("legacy-admin", f.alice),
      (error) => error.status === 409 && error.message === "user_has_payment_records");
    const subjectGrant = await prisma.accessEntitlement.create({ data: { userId: f.alice, subjectId: f.sa2, scopeType: "subject" } });
    await assert.rejects(prisma.subject.delete({ where: { id: f.sa2 } }));
    assert.ok(await prisma.accessEntitlement.findUnique({ where: { id: subjectGrant.id } }));
  });
  await check("HTTP rejects cross-origin code redemption and the retired request endpoint creates no data", async () => {
    await prisma.authRateLimit.deleteMany();
    assert.equal((await http.paymentPost(request("redeem", { code, subjectId: f.sa }, { origin: "https://evil.example" }))).status, 403);
    const retired = load("src/app/api/v1/student/access/payment-request/route.ts");
    assert.equal((await retired.POST()).status, 410);
    actorId = null;
    assert.equal((await http.paymentPost(request("redeem", { code, subjectId: f.sa }))).status, 401);
    actorId = f.alice;
  });
  await prisma.authRateLimit.deleteMany();
  process.env.PAYMENT_V1_ENABLED = "false";
  console.log(`${count} P3 PostgreSQL/service acceptance groups passed`);
} finally { await prisma.$disconnect(); }

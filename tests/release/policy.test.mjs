import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { moduleLoader } from "../admin/load-module.mjs";

function release(env = {}) {
  return moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {} }, { process: { env } })("src/lib/server/payment-scope.ts");
}
test("launch list is explicit, bounded, structured and fails closed as a whole", () => {
  for (const value of [undefined, "", "*", '"plan-1"', "{}", '["plan-1",null]', '["plan-1","*"]', '[" plan-1"]', "[", JSON.stringify(Array(201).fill("p")), " ".repeat(20001)]) {
    const config = release({ PAYMENT_V1_ENABLED: "true", PAYMENT_LAUNCH_PLAN_IDS: value });
    assert.equal(config.paymentSalesEnabled(), false); assert.deepEqual(Array.from(config.paymentLaunchPlanIds()), []);
  }
  const config = release({ PAYMENT_V1_ENABLED: "true", PAYMENT_LAUNCH_PLAN_IDS: '["p1","p2","p1"]' });
  assert.deepEqual(Array.from(config.paymentLaunchPlanIds()), ["p1", "p2"]);
  config.requirePaymentSales(["p1"]);
  assert.throws(() => config.requirePaymentSales(["p3"]), /plan_not_in_launch/);
});
test("code plan list is independent, bounded and fail-closed", () => {
  for (const value of [undefined, "", "*", '"p1"', '["p1",null]', '[" p1"]', JSON.stringify(Array(201).fill("p"))]) {
    const config = release({ PAYMENT_CODES_ENABLED: "true", PAYMENT_CODE_PLAN_IDS: value });
    assert.deepEqual(Array.from(config.paymentCodePlanIds()), []);
    assert.equal(config.paymentCodePlanEnabled("p1"), false);
    assert.throws(() => config.requirePaymentCodePlan("p1"), /code_plan_not_enabled/);
  }
  const config = release({ PAYMENT_CODES_ENABLED: "true", PAYMENT_CODE_PLAN_IDS: '["p1","p1"]', PAYMENT_LAUNCH_PLAN_IDS: '["sale-only"]' });
  assert.deepEqual(Array.from(config.paymentCodePlanIds()), ["p1"]);
  assert.equal(config.paymentCodePlanEnabled("p1"), true);
  assert.equal(config.paymentCodePlanEnabled("sale-only"), false);
});
test("sales, reviews and codes are independent explicit switches; old sales flag alone opens nothing", () => {
  const old = release({ PAYMENT_V1_ENABLED: "true" });
  assert.equal(old.paymentSalesEnabled(), false); assert.equal(old.paymentReviewEnabled(), false); assert.equal(old.paymentCodesEnabled(), false);
  for (const sales of [false, true]) for (const review of [false, true]) for (const codes of [false, true]) {
    const config = release({ PAYMENT_V1_ENABLED: String(sales), PAYMENT_REVIEW_ENABLED: String(review), PAYMENT_CODES_ENABLED: String(codes), PAYMENT_LAUNCH_PLAN_IDS: '["p1"]' });
    assert.equal(config.paymentSalesEnabled(), sales); assert.equal(config.paymentReviewEnabled(), review); assert.equal(config.paymentCodesEnabled(), codes);
  }
  for (const value of [undefined, "TRUE", "1", "yes", "true "]) {
    const config = release({ PAYMENT_V1_ENABLED: value, PAYMENT_REVIEW_ENABLED: value, PAYMENT_CODES_ENABLED: value, PAYMENT_LAUNCH_PLAN_IDS: '["p1"]' });
    for (const run of [config.requirePaymentSales, config.requirePaymentReview, config.requirePaymentCodes]) assert.throws(() => run());
  }
});
function accessHarness({ sales = false, codes = false, user = true, grant = false, type = "paid", outside = false, plans = ["p1"], listed = ["p1"], codeListed = ["p1"] } = {}) {
  const counts = { auth: 0, plans: 0, grants: 0 };
  const subject = { id: "s1", majorId: "m1", isActive: true, major: { isActive: true, university: { isActive: true, countryCode: outside ? "YE" : "SA", institutionType: "university" } } };
  const prisma = {
    quiz: { findFirst: async () => ({ accessType: type, isFreePreview: false, subject, questions: [] }) },
    paidAccessPlan: { findFirst: async ({ where }) => { counts.plans++; const id = plans.find((p) => !where.id || where.id.in.includes(p)); return id ? { id, scopeType: "subject", subjectId: "s1", majorId: null, price: { toString: () => "100" } } : null; } },
    accessEntitlement: { findFirst: async () => { counts.grants++; return grant ? { id: "grant" } : null; } },
  };
  const load = moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": { getCurrentUser: async () => {
    counts.auth++; return user ? { id: "student", role: "student", isActive: true, emailVerified: new Date() } : null;
  } } }, { process: { env: { PAYMENT_V1_ENABLED: String(sales), PAYMENT_CODES_ENABLED: String(codes), PAYMENT_LAUNCH_PLAN_IDS: JSON.stringify(listed), PAYMENT_CODE_PLAN_IDS: JSON.stringify(codeListed) } } });
  return { counts, read: () => load("src/lib/server/access-control.ts").checkQuizAccess({ quizId: "quiz" }) };
}
test("pausing sales or removing a plan never revokes paid access or opens it to another student", async () => {
  for (const sales of [false, true]) for (const listed of [[], ["other"]]) for (const type of ["paid", "inherit"]) {
    const buyer = await accessHarness({ sales, listed, type, grant: true }).read();
    assert.equal(buyer.allowed, true); assert.equal(buyer.reason, "entitled"); assert.equal(buyer.canPurchase, false);
    const stranger = await accessHarness({ sales, listed, type }).read();
    assert.equal(stranger.allowed, false); assert.equal(stranger.canRedeemCode, false);
    const visitor = await accessHarness({ sales, listed, type, user: false }).read();
    assert.equal(visitor.allowed, false); assert.equal(visitor.reason, "student_signin_required");
  }
});
test("sale options prefer an approved plan; codes do not inherit sales availability", async () => {
  const sale = await accessHarness({ sales: true, plans: ["outside-list", "p1"] }).read();
  assert.equal(sale.plan.id, "p1"); assert.equal(sale.canPurchase, true); assert.equal(sale.canRedeemCode, false);
  const codeOnly = await accessHarness({ codes: true }).read();
  assert.equal(codeOnly.canPurchase, false); assert.equal(codeOnly.canRedeemCode, true);
  assert.equal((await accessHarness({ codes: true, codeListed: [], listed: ["p1"] }).read()).canRedeemCode, false);
  for (const options of [{ outside: true }, { type: "free" }, { type: "inherit", plans: [] }]) {
    const h = accessHarness({ sales: true, codes: true, ...options }); const result = await h.read();
    assert.equal(result.allowed, true); assert.equal(result.canPurchase, false); assert.equal(result.canRedeemCode, false);
    assert.equal(h.counts.auth, 0); assert.equal(h.counts.grants, 0);
  }
});
test("closed code issuance and redemption stop at the server even when sales are open", async () => {
  let calls = 0;
  const load = moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": { getCurrentUser: async () => { calls++; } } },
    { process: { env: { PAYMENT_V1_ENABLED: "true", PAYMENT_LAUNCH_PLAN_IDS: '["p1"]' } } });
  await assert.rejects(load("src/lib/server/payment-admin.ts").issuePaymentCode("admin", {}), /payment_codes_unavailable/);
  await assert.rejects(load("src/lib/server/payment-mutations.ts").redeemSubscriptionCode({}), /payment_codes_unavailable/);
  const response = await load("src/lib/server/payment-http.ts").paymentPost(new Request("https://example.test/redeem", { method: "POST" }));
  assert.equal(response.status, 503); assert.equal(calls, 0);
});
test("release controls cannot be supplied through a checkout or review body", () => {
  const load = moduleLoader();
  const quote = load("src/validations/payment-order.ts").orderQuoteSchema;
  const review = load("src/validations/payment-review.ts").reviewSubmissionSchema;
  const id = "00000000-0000-4000-8000-000000000001";
  for (const key of ["salesEnabled", "reviewEnabled", "codesEnabled", "launchPlanIds", "PAYMENT_V1_ENABLED"]) {
    assert.equal(quote.safeParse({ planIds: [id], [key]: true }).success, false);
    assert.equal(review.safeParse({ expectedVersion: 0, idempotencyKey: id, [key]: true }).success, false);
  }
});
test("R1 leaves the reviewed P5 migration unchanged", () => {
  const sql = readFileSync("prisma/migrations/20260913090000_payment_review/migration.sql");
  assert.equal(createHash("sha256").update(sql).digest("hex"), "2c34bbc94678014fb3245adba549e1986e59926d75851aadba54ff17ca9d5b99");
});

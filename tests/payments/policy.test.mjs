import test from "node:test";
import assert from "node:assert/strict";
import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "./fixtures.mjs";

function subject(countryCode = "SA", institutionType = "university") {
  return { id: f.sa, majorId: "real-major", isActive: true, major: { isActive: true, university: { isActive: true, countryCode, institutionType } } };
}
function harness({ country = "SA", type = "university", enabled = "true", accessType = "paid", preview = false, identity = null } = {}) {
  const counts = { auth: 0, plan: 0, entitlement: 0 };
  const data = subject(country, type);
  const prisma = {
    subject: { findFirst: async () => data },
    major: { findFirst: async () => ({ id: "real-major" }) },
    quiz: { findFirst: async () => ({ accessType, isFreePreview: preview, subject: data, questions: [] }) },
    paidAccessPlan: { findFirst: async () => { counts.plan++; return null; } },
    accessEntitlement: { findFirst: async (query) => { counts.entitlement++; assert.equal(query.where.userId, identity.id); return null; } },
  };
  const load = moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": { getCurrentUser: async () => { counts.auth++; return identity; } } },
    { process: { env: { PAYMENT_V1_ENABLED: enabled } } });
  return { load, counts, prisma, access: load("src/lib/server/access-control.ts") };
}

test("YE and academies never consult accounts, plans, entitlements or anonymous sessions", async () => {
  for (const [country, type] of [["YE", "university"], ["SA", "academy"], ["YE", "academy"], ["AE", "university"]]) {
    const h = harness({ country, type });
    assert.equal((await h.access.checkQuizAccess({ quizId: "q" })).reason, "out_of_scope");
    assert.equal((await h.access.checkScopeAccess({ subjectId: "s", majorId: "forged-major" })).reason, "out_of_scope");
    assert.deepEqual(h.counts, { auth: 0, plan: 0, entitlement: 0 });
  }
});
test("free and preview SA material stays public while paid material fails closed before launch", async () => {
  for (const [accessType, preview, reason] of [["free", false, "free"], ["paid", true, "free_preview"], ["paid", false, "payments_unavailable"]]) {
    const h = harness({ enabled: "false", accessType, preview });
    const result = await h.access.checkQuizAccess({ quizId: "q" });
    assert.equal(result.reason, reason === "payments_unavailable" ? "student_signin_required" : reason);
    assert.equal(result.canPurchase, false); assert.equal(result.canRedeemCode, false);
    assert.deepEqual(h.counts, reason === "payments_unavailable" ? { auth: 1, plan: 1, entitlement: 0 } : { auth: 0, plan: 0, entitlement: 0 });
  }
});
test("student identity is required and major-level legacy plans cannot grant access", async () => {
  const h = harness();
  assert.equal((await h.access.checkQuizAccess({ quizId: "q" })).reason, "student_signin_required");
  assert.equal(h.counts.entitlement, 0);
  const major = await h.access.checkScopeAccess({ majorId: "real-major" });
  assert.equal(major.reason, "out_of_scope"); assert.equal(h.counts.plan, 1);
  const user = { id: "student", role: "student", isActive: true, emailVerified: new Date(), sessionVersion: 0 };
  const student = harness({ identity: user });
  assert.equal((await student.access.checkQuizAccess({ quizId: "q" })).reason, "payments_unavailable");
  assert.equal(student.counts.entitlement, 1);
});
test("missing/mixed quiz ownership and unpublished records never fail open", async () => {
  const h = harness();
  h.prisma.quiz.findFirst = async () => null;
  assert.equal((await h.access.checkQuizAccess({ quizId: "hidden" })).reason, "not_found");
  h.prisma.quiz.findFirst = async () => ({ accessType: "paid", isFreePreview: false, subject: null, questions: [] });
  assert.equal((await h.access.checkQuizAccess({ quizId: "missing" })).reason, "missing_context");
  h.prisma.quiz.findFirst = async () => ({ accessType: "paid", isFreePreview: false, subject: { ...subject("YE"), id: "ye" }, questions: [{ question: { chapter: { subject: subject() } } }] });
  assert.equal((await h.access.checkQuizAccess({ quizId: "mixed" })).reason, "missing_context");
  assert.equal(h.counts.entitlement, 0);
});
test("payment schemas reject client authority and the retired manual-request schema is absent", () => {
  const schemas = moduleLoader()("src/validations/payment.ts");
  for (const key of ["userId", "anonymousSessionId", "role", "countryCode", "institutionType", "price", "status", "majorId"]) {
    assert.equal(schemas.redeemPaymentCodeSchema.safeParse({ code: "QB-test", subjectId: f.sa, [key]: "forged" }).success, false);
  }
  assert.equal(schemas.redeemPaymentCodeSchema.safeParse({ code: "code" }).success, false);
  assert.equal("paymentRequestSchema" in schemas, false);
});

test("release flag closes code redemption before any database or authentication work", async () => {
  for (const flag of [undefined, "false", "TRUE", "1"]) {
    const h = harness({ enabled: flag ?? "" });
    const post = h.load("src/lib/server/payment-http.ts").paymentPost;
    const response = await post(new Request("https://mustawak.com/api/v1/student/access/redeem", { method: "POST", body: "{}" }));
    assert.equal(response.status, 503); assert.match(response.headers.get("cache-control"), /no-store/);
    assert.deepEqual(h.counts, { auth: 0, plan: 0, entitlement: 0 });
  }
});

test("authenticated server reads forward cookies only to the configured origin and never cache content", async () => {
  const calls = [];
  const load = moduleLoader({ "next/headers": { headers: async () => new Headers({ cookie: "session=test", host: "evil.example", "x-forwarded-host": "evil.example" }) } }, {
    process: { env: { NEXTAUTH_URL: "https://mustawak.com", NODE_ENV: "production" } },
    fetch: async (url, options) => { calls.push({ url, options }); return Response.json({ data: { ok: true } }); },
  });
  const service = load("src/lib/server/student-fetch.ts");
  assert.equal((await service.fetchAuthenticatedStudentJSON("/api/v1/student/quizzes/by-id/test")).data.ok, true);
  assert.equal(calls[0].url, "https://mustawak.com/api/v1/student/quizzes/by-id/test");
  assert.equal(calls[0].options.headers.cookie, "session=test"); assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.next, undefined);
  for (const path of ["https://evil.example/api/v1/student/test", "//evil.example/api/v1/student/test", "/api/v1/admin/users"]) {
    await assert.rejects(service.fetchAuthenticatedStudentJSON(path), /invalid_student_api_path/);
  }
  assert.equal(calls.length, 1);
});

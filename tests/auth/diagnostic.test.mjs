import test from "node:test";
import assert from "node:assert/strict";
import { moduleLoader } from "../admin/load-module.mjs";

const origin = "https://staging.example";
const diagnostics = moduleLoader()("src/lib/server/student-auth-diagnostic.ts");

test("SMTP diagnostic classifies only known stages and allowlisted numeric/code fields", () => {
  const cases = [
    [{ code: "ETIMEDOUT" }, "smtp_timeout"],
    [{ code: "EAUTH", responseCode: 535 }, "smtp_auth"],
    [{ command: "STARTTLS" }, "smtp_tls"],
    [{ command: "MAIL FROM" }, "smtp_sender"],
    [{ command: "RCPT TO" }, "smtp_recipient"],
    [{ code: "ECONNECTION" }, "smtp_connect"],
    [{ message: "auth_mail_not_configured" }, "config"],
    [{ code: "PRIVATE_VALUE", message: "password and token in error" }, "unknown"],
  ];
  for (const [error, stage] of cases) assert.equal(diagnostics.classifySmtpFailure(error), stage);
  assert.deepEqual(diagnostics.safeAuthErrorFields({ code: "EAUTH", responseCode: 535, message: "secret" }), { code: "EAUTH", responseCode: 535 });
  assert.deepEqual(diagnostics.safeAuthErrorFields({ code: "SECRET", responseCode: 200, message: "secret" }), {});
});

function request() {
  return new Request(`${origin}/api/v1/auth/resend-verification`, {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ email: "student@example.test" }),
  });
}

function httpHarness({ failAt, branch = "payment-staging", environment = "preview" }) {
  const events = [];
  const secretError = Object.assign(new Error("password=private token=private email=student@example.test"), { code: "EAUTH", responseCode: 535 });
  class TestAuthRateLimitError extends Error { constructor() { super("too_many_requests"); this.retryAfter = 60; } }
  const load = moduleLoader({
    "@/lib/server/auth-config": {
      authOrigin: () => origin,
      mailConfig: () => { if (failAt === "config") throw secretError; },
      registrationConfigured: () => false,
    },
    "@/lib/server/auth-rate-limit": {
      AuthRateLimitError: TestAuthRateLimitError,
      requestIdentity: () => "shared",
      consumeAuthLimit: async () => {
        if (failAt === "rate_limit") throw secretError;
        if (failAt === "rate_limit_exceeded") throw new TestAuthRateLimitError();
      },
    },
    "@/lib/server/student-accounts": {
      InvalidAuthTokenError: class extends Error {},
      requestStudentEmail: async (_email, _purpose, _callback, onStage) => {
        if (failAt === "user_lookup") throw secretError;
        onStage?.(failAt);
        if (failAt) throw secretError;
      },
    },
  }, {
    process: { env: { VERCEL_ENV: environment, VERCEL_GIT_COMMIT_REF: branch } },
    console: { error: (...args) => events.push(args) },
  });
  return { post: load("src/lib/server/student-auth-http.ts").studentAuthPost, events };
}

test("resend failure stays generic while preview branch logs only stage and safe codes", async () => {
  for (const stage of ["config", "rate_limit", "user_lookup", "token_create", "smtp_auth", "token_cleanup"]) {
    const h = httpHarness({ failAt: stage });
    const response = await h.post(request(), "resend-verification");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "temporarily_unavailable" });
    assert.deepEqual(h.events, [["student_auth_staging_diagnostic", {
      action: "resend-verification", stage, code: "EAUTH", responseCode: 535,
    }]]);
    assert.doesNotMatch(JSON.stringify(h.events), /private|student@example/);
  }
});

test("diagnostic is disabled outside payment-staging preview", async () => {
  for (const options of [{ branch: "other-branch" }, { environment: "production" }]) {
    const h = httpHarness({ failAt: "smtp_auth", ...options });
    assert.equal((await h.post(request(), "resend-verification")).status, 503);
    assert.deepEqual(h.events, [["student_auth_unavailable", { action: "resend-verification" }]]);
  }
});

test("ordinary rate-limit rejection remains 429 without a diagnostic log", async () => {
  const h = httpHarness({ failAt: "rate_limit_exceeded" });
  const response = await h.post(request(), "resend-verification");
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "too_many_requests" });
  assert.deepEqual(h.events, []);
});

test("token creation, SMTP failure and cleanup expose only their stage to the caller", async () => {
  for (const cleanupFails of [false, true]) {
    const stages = [];
    const prisma = {
      user: { findUnique: async () => ({ id: "test-user", email: "student@example.test", role: "student", isActive: true, emailVerified: null, sessionVersion: 0 }) },
      userAuthToken: {
        create: async () => ({ id: "test-token" }),
        deleteMany: async () => { if (cleanupFails) throw new Error("cleanup failed"); },
      },
    };
    const accounts = moduleLoader({
      "@/lib/prisma": { prisma },
      "@/lib/server/auth-config": { authOrigin: () => origin },
      "@/lib/server/auth-mail": { sendAuthMail: async () => { throw Object.assign(new Error("SMTP private details"), { code: "EAUTH" }); } },
    })("src/lib/server/student-accounts.ts");
    await assert.rejects(accounts.requestStudentEmail("student@example.test", "verify_email", undefined, (stage) => stages.push(stage)));
    assert.deepEqual(stages, ["user_lookup", "token_create", "config", "smtp_connect", "token_cleanup", ...(cleanupFails ? [] : ["smtp_auth"])]);
  }
});

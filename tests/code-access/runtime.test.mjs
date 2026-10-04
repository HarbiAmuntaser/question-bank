import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const subjectId = "90000000-0000-4000-8000-000000000401";
const quizId = "90000000-0000-4000-8000-000000000402";
const idempotencyKey = "90000000-0000-4000-8000-000000000403";
const rawCode = "QB-ABCD-EFGH-JKLM";
const token = "A".repeat(43);
const expiresAt = new Date(Date.now() + 86_400_000);

function cookieModule({ active = true, production = true } = {}) {
  const prisma = {
    guestAccessSession: {
      findUnique: async () => active ? { expiresAt, revokedAt: null } : null,
    },
  };
  return moduleLoader({
    "@/lib/prisma": { prisma },
    "next/headers": { cookies: async () => ({ get: () => ({ value: token }) }) },
  }, { process: { env: { NEXTAUTH_SECRET: "test-secret", NODE_ENV: production ? "production" : "test" } } })(
    "src/lib/server/code-access-cookie.ts",
  );
}

test("guest token derivation is deterministic, scoped and never exposes the raw code", () => {
  const accessCookie = cookieModule();
  const input = { idempotencyKey, code: rawCode, subjectId };
  const first = accessCookie.deriveGuestAccessToken(input);
  assert.equal(first, accessCookie.deriveGuestAccessToken(input));
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, accessCookie.deriveGuestAccessToken({ ...input, idempotencyKey: randomUUID() }));
  assert.equal(first.includes("ABCD"), false);
});

test("guest cookie parsing, validation and production attributes fail closed", async () => {
  const accessCookie = cookieModule();
  const request = new Request("https://mustawak.com/test", { headers: { cookie: `other=x; mw_code_access=${token}` } });
  assert.equal(accessCookie.guestAccessTokenFromRequest(request), token);
  assert.equal(await accessCookie.activeGuestAccessTokenFromRequest(request), token);
  assert.equal(await accessCookie.guestAccessTokenFromServerCookies(), token);
  const header = accessCookie.guestAccessCookieHeader(token, expiresAt);
  for (const marker of ["mw_code_access=", "Path=/", "HttpOnly", "SameSite=Lax", "Expires=", "Max-Age=", "Secure"]) {
    assert.match(header, new RegExp(marker));
  }
  assert.equal(header.includes(rawCode), false);
  assert.equal(cookieModule({ active: false }).guestAccessTokenFromRequest(
    new Request("https://mustawak.com/test", { headers: { cookie: "mw_code_access=invalid" } }),
  ), null);
});

class TestPaymentError extends Error {
  constructor(code, status = 400, publicDetails) {
    super(code);
    this.code = code;
    this.status = status;
    this.publicDetails = publicDetails;
  }
}
class TestRateLimitError extends Error {
  constructor(retryAfter) { super("too_many_requests"); this.retryAfter = retryAfter; }
}

function httpHarness({ user = null, existingToken = null, failLimit = false, activationError = null } = {}) {
  const calls = { limits: [], activations: [], access: [], quiz: [], activeCookie: 0 };
  const resultToken = user ? null : token;
  const mocks = {
    "@/lib/server/auth-config": { authOrigin: () => "https://mustawak.com" },
    "@/lib/server/auth-rate-limit": {
      AuthRateLimitError: TestRateLimitError,
      requestIdentity: () => "203.0.113.4",
      consumeAuthLimit: async (...args) => { calls.limits.push(args); if (failLimit) throw new TestRateLimitError(60); },
    },
    "@/lib/server/payment-scope": {
      PaymentError: TestPaymentError,
      requirePaymentCodes() {},
      getPaymentStudent: async () => user,
    },
    "@/lib/server/code-access-cookie": {
      activeGuestAccessTokenFromRequest: async () => { calls.activeCookie++; return existingToken; },
      deriveGuestAccessToken: () => token,
      guestAccessCookieHeader: (value) => `mw_code_access=${value}; Path=/; HttpOnly; SameSite=Lax; Secure`,
    },
    "@/lib/server/code-access": {
      activateCodeAccess: async (input) => {
        calls.activations.push(input);
        if (activationError) throw activationError;
        return {
          outcome: "activated",
          alreadyActive: false,
          grant: { id: "grant", subjectId, startsAt: new Date(), expiresAt, principalType: user ? "account" : "guest" },
          plan: { id: "plan" },
          codePreview: "QB-...JKLM",
          supportReference: "AC-SUPPORT",
          guestSessionToken: resultToken,
          guestSessionExpiresAt: resultToken ? expiresAt : null,
        };
      },
    },
    "@/lib/server/access-control": {
      checkQuizAccess: async (input) => { calls.quiz.push(input); return { subjectId, reason: "paid_access_required" }; },
      checkScopeAccess: async (input) => { calls.access.push(input); return { allowed: true, accessSource: user ? "account_code" : "guest_code" }; },
    },
  };
  return { calls, post: moduleLoader(mocks)("src/lib/server/payment-http.ts").paymentPost };
}

function activationRequest(body, headers = {}) {
  return new Request("https://mustawak.com/api/v1/student/access/redeem", {
    method: "POST",
    headers: { origin: "https://mustawak.com", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = { code: rawCode, subjectId, quizId, idempotencyKey, operation: "activate" };

test("guest HTTP activation uses the new grant service, sets a secure cookie and omits the token from JSON", async () => {
  const harness = httpHarness();
  const response = await harness.post(activationRequest(validBody));
  assert.equal(response.status, 200);
  assert.deepEqual(harness.calls.limits.map((entry) => entry[0]), ["code-access-ip", "code-access-code"]);
  assert.equal(harness.calls.activations.length, 1);
  assert.deepEqual(harness.calls.activations[0].principal, { type: "guest", sessionToken: token });
  assert.equal(harness.calls.activations[0].adminOverride, undefined);
  assert.deepEqual(harness.calls.quiz[0], { quizId, guestSessionToken: null });
  assert.deepEqual(harness.calls.access[0], { subjectId, guestSessionToken: token });
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  const raw = await response.text();
  assert.equal(raw.includes(token), false);
  const body = JSON.parse(raw);
  assert.equal(body.data.access.accessSource, "guest_code");
  assert.equal(body.data.supportReference, "AC-SUPPORT");
});

test("account HTTP activation is account-bound and never creates or reads a guest cookie", async () => {
  const user = { id: "student", sessionVersion: 7 };
  const harness = httpHarness({ user });
  const response = await harness.post(activationRequest(validBody, { cookie: `mw_code_access=${token}` }));
  assert.equal(response.status, 200);
  assert.deepEqual(harness.calls.limits.map((entry) => entry[0]), ["code-access-ip", "code-access-code", "code-access-user"]);
  assert.deepEqual(harness.calls.activations[0].principal, { type: "account", user });
  assert.equal(harness.calls.activeCookie, 0);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await response.json()).data.access.accessSource, "account_code");
});

test("recovery and transfer reuse a valid guest cookie while account transfer fails closed", async () => {
  const guest = httpHarness({ existingToken: token });
  const recovery = await guest.post(activationRequest({ ...validBody, quizId: undefined, operation: "recover" }, {
    cookie: `mw_code_access=${token}`,
  }));
  assert.equal(recovery.status, 200);
  assert.equal(guest.calls.activations[0].operation, "recover");
  assert.equal(guest.calls.activations[0].principal.sessionToken, token);

  const account = httpHarness({ user: { id: "student", sessionVersion: 0 } });
  const transfer = await account.post(activationRequest({ ...validBody, quizId: undefined, operation: "transfer" }));
  assert.equal(transfer.status, 409);
  assert.equal(account.calls.activations.length, 0);
});

test("HTTP security rejects cross-origin, unknown authority fields and limiter failure before activation", async () => {
  const crossOrigin = httpHarness();
  assert.equal((await crossOrigin.post(activationRequest(validBody, { origin: "https://evil.example" }))).status, 403);
  assert.equal(crossOrigin.calls.activations.length, 0);

  const injected = httpHarness();
  assert.equal((await injected.post(activationRequest({ ...validBody, userId: "admin" }))).status, 400);
  assert.equal(injected.calls.activations.length, 0);

  const limited = httpHarness({ failLimit: true });
  const response = await limited.post(activationRequest(validBody));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(limited.calls.activations.length, 0);
});

test("HTTP exposes only allowlisted support metadata for recover and transfer states", async () => {
  const publicDetails = {
    supportReference: "AC-ABCDEFGHJKLM",
    whatsappNumber: "+966531297661",
    maxBrowserSessions: 2,
    retryAfterSeconds: 175,
    rawCode,
    token,
  };
  const cooldown = httpHarness({
    activationError: new TestPaymentError("transfer_too_soon", 429, publicDetails),
  });
  const cooldownResponse = await cooldown.post(activationRequest({ ...validBody, operation: "transfer" }));
  assert.equal(cooldownResponse.status, 429);
  assert.equal(cooldownResponse.headers.get("retry-after"), "175");
  assert.deepEqual(await cooldownResponse.json(), {
    error: "transfer_too_soon",
    code: "transfer_too_soon",
    support: {
      supportReference: "AC-ABCDEFGHJKLM",
      whatsappNumber: "+966531297661",
      maxBrowserSessions: 2,
      retryAfterSeconds: 175,
    },
  });

  const malformed = httpHarness({
    activationError: new TestPaymentError("browser_limit_reached", 409, {
      supportReference: rawCode,
      whatsappNumber: "javascript:alert(1)",
      maxBrowserSessions: 500,
      token,
    }),
  });
  const malformedBody = await (await malformed.post(activationRequest(validBody))).json();
  assert.deepEqual(malformedBody.support, {
    supportReference: null,
    whatsappNumber: null,
    maxBrowserSessions: 1,
    retryAfterSeconds: null,
  });
  assert.equal(JSON.stringify(malformedBody).includes(rawCode), false);
  assert.equal(JSON.stringify(malformedBody).includes(token), false);
});

test("all protected runtime entry points forward the guest token and keep signed URLs behind authorization", () => {
  const expected = {
    "src/app/api/v1/student/access/status/route.ts": [
      /getQuizAccessMap\(Array\.from\(publicIds\), guestSessionToken\)/,
      /getStudySummaryAccessMap\([\s\S]*guestSessionToken/,
      /checkScopeAccess\(\{ subjectId, majorId, guestSessionToken \}\)/,
    ],
    "src/app/api/v1/student/quizzes/by-id/[id]/route.ts": [/checkQuizAccess\(\{ quizId: id, guestSessionToken:/],
    "src/app/api/v1/student/quizzes/by-id-context/[id]/route.ts": [/checkQuizAccess\(\{ quizId: id, guestSessionToken:/],
    "src/app/api/v1/student/quizzes/grade/route.ts": [/checkQuizAccess\(\{ quizId, guestSessionToken:/],
    "src/app/api/v1/student/summaries/[id]/pdf/route.ts": [/checkStudySummaryAccess\([\s\S]*guestSessionToken:/],
    "src/app/api/v1/student/chapters/[chapterId]/attachments/[attachmentId]/route.ts": [/checkScopeAccess\([\s\S]*guestSessionToken:/],
    "src/components/public/study-summaries/study-summary-details.tsx": [/guestAccessTokenFromServerCookies/, /getPublishedStudySummaryContent\(summary\.id, guestSessionToken\)/],
  };
  for (const [file, patterns] of Object.entries(expected)) {
    const source = readFileSync(file, "utf8");
    for (const pattern of patterns) assert.match(source, pattern, `${file}: ${pattern}`);
  }

  for (const file of [
    "src/app/api/v1/student/summaries/[id]/pdf/route.ts",
    "src/app/api/v1/student/chapters/[chapterId]/attachments/[attachmentId]/route.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.ok(source.indexOf("if (!access.allowed)") < source.indexOf("await createPresignedGetUrl"), file);
  }
});

test("runtime ignores the retired code-plan allowlist and exposes neither guest tokens nor raw errors", () => {
  const scope = readFileSync("src/lib/server/payment-scope.ts", "utf8");
  const service = readFileSync("src/lib/server/code-access.ts", "utf8");
  const http = readFileSync("src/lib/server/payment-http.ts", "utf8");
  assert.doesNotMatch(scope, /PAYMENT_CODE_PLAN_IDS/);
  assert.match(service, /requirePaymentCodePlan/);
  assert.doesNotMatch(http, /guestSessionToken:\s*activated\.guestSessionToken/);
  assert.match(http, /console\.error\("code_access_http_failed"\)/);
  assert.doesNotMatch(http, /console\.error\([^)]*error/);
});

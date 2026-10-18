import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { moduleLoader } from "../admin/load-module.mjs";

const env = {
  PAYMENT_V1_ENABLED: "false", PAYMENT_REVIEW_ENABLED: "true",
  PAYMENT_CODES_ENABLED: "true", PAYMENT_LAUNCH_PLAN_IDS: '["plan"]',
};
const user = { id: "student", role: "student", isActive: true, emailVerified: new Date(), sessionVersion: 0 };
const origin = "https://mustawak.test";
const request = () => new Request(origin + "/api/v1/student/orders", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}",
});

test("code-only mode blocks all new-order HTTP and service entry points before side effects", async () => {
  const forbidden = new Proxy({}, { get() { throw new Error("unexpected database access"); } });
  const load = moduleLoader({
    "@/lib/prisma": { prisma: forbidden },
    "@/lib/auth-helpers": { getCurrentUser() { throw new Error("unexpected authentication"); } },
  }, { process: { env } });
  const http = load("src/lib/server/payment-order-http.ts");
  for (const action of ["catalog", "quote", "create"]) {
    const response = await http.orderHttp(request(), action);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "payments_unavailable");
  }
  const orders = load("src/lib/server/payment-orders.ts");
  for (const run of [() => orders.orderCatalog({}), () => orders.quoteOrder({}), () => orders.createOrder({})]) {
    await assert.rejects(run(), /payments_unavailable/);
  }
  const controls = load("src/lib/server/payment-scope.ts");
  assert.equal(controls.paymentReviewEnabled(), true);
  assert.equal(controls.paymentCodePlanEnabled("plan", true), true);
});

test("existing-order list/get/contact/review/cancel still dispatch with sales off and review on", async () => {
  const calls = [];
  const operation = (name) => async () => { calls.push(name); return { id: "old-order" }; };
  class OrderError extends Error {}
  const load = moduleLoader({
    "@/lib/prisma": { prisma: {} },
    "@/lib/auth-helpers": { getCurrentUser: async () => user },
    "@/lib/server/auth-config": { authOrigin: () => origin },
    "@/lib/server/auth-rate-limit": {
      AuthRateLimitError: class extends Error {},
      consumeAuthLimit: async () => {}, requestIdentity: () => "local-test",
    },
    "@/lib/server/payment-orders": {
      OrderError, listOrders: operation("list"), getOrder: operation("get"),
      contactOrder: operation("contact"), cancelOrder: operation("cancel"),
    },
    "@/lib/server/payment-reviews": { submitOrderReview: operation("review") },
  }, { process: { env } });
  for (const action of ["list", "get", "contact", "review", "cancel"]) {
    assert.equal((await load("src/lib/server/payment-order-http.ts").orderHttp(request(), action, "old-order")).status, 200);
  }
  assert.deepEqual(calls, ["list", "get", "contact", "review", "cancel"]);
});

function activationHarness() {
  let now = new Date("2026-10-18T10:00:00Z");
  let grant = null;
  const sessions = new Map(), bindings = [], events = [];
  const code = { id: "code", planId: "plan", isActive: true, usedCount: 0, durationDays: 7,
    startsAt: null, expiresAt: null, maxBrowserSessions: 1, supportReference: null, codePreview: null,
    plan: { id: "plan", scopeType: "subject", subjectId: "subject", majorId: null,
      isActive: true, activationCodesEnabled: true, defaultDurationDays: 7, price: "1", currency: "SAR" } };
  const tx = {
    $queryRaw: async () => [{ now }],
    user: { findUnique: async () => user },
    subject: { findFirst: async () => ({ id: "subject", major: { university: { countryCode: "SA", institutionType: "university" } } }) },
    subscriptionCode: { findUnique: async () => code, findUniqueOrThrow: async () => code },
    codeAccessGrant: {
      findUnique: async () => grant, findFirst: async () => null,
      create: async ({ data }) => (grant = { id: "grant", ...data, isActive: true, revokedAt: null }),
    },
    accessEntitlement: { count: async () => 0, findFirst: async () => null },
    guestAccessSession: {
      findUnique: async ({ where }) => sessions.get(where.tokenHash) ?? null,
      create: async ({ data }) => { const session = { id: randomUUID(), revokedAt: null, ...data }; sessions.set(data.tokenHash, session); return session; },
      update: async ({ where, data }) => { const row = [...sessions.values()].find((s) => s.id === where.id); Object.assign(row, data); return row; },
    },
    codeAccessSessionBinding: {
      findUnique: async ({ where }) => bindings.find((b) => b.grantId === where.grantId_sessionId.grantId && b.sessionId === where.grantId_sessionId.sessionId) ?? null,
      findMany: async () => bindings.filter((b) => !b.revokedAt).sort((a, b) => a.lastUsedAt - b.lastUsedAt),
      create: async ({ data }) => { const row = { id: randomUUID(), revokedAt: null, ...data }; bindings.push(row); return row; },
      update: async ({ where, data }) => { const row = bindings.find((b) => b.id === where.id); Object.assign(row, data); return row; },
    },
    codeAccessEvent: {
      findUnique: async ({ where }) => events.find((e) => e.idempotencyKey === where.grantId_idempotencyKey.idempotencyKey) ?? null,
      findMany: async ({ where }) => events.filter((e) => e.type === where.type && e.createdAt > where.createdAt.gt).reverse(),
      create: async ({ data }) => { const row = { ...data, createdAt: now }; events.push(row); return row; },
    },
  };
  const load = moduleLoader({
    "@/lib/prisma": { prisma: {} },
    "@/lib/auth-helpers": { getCurrentUser: async () => user },
    "@/lib/server/payment-transaction": { paymentTransaction: async (run) => run(tx) },
    "@/lib/server/payment-order-access": { lockPaymentUsers: async () => {}, refreshPaymentAccount: async () => {} },
    "@/lib/server/telegram/sync-queue": {},
    "@/lib/server/telegram/sync": {},
  }, { process: { env } });
  const service = load("src/lib/server/code-access.ts");
  const activate = (principal, operation = "activate") => service.activateCodeAccess({
    code: "QB-ABCD-EFGH-JKLM", subjectId: "subject", idempotencyKey: randomUUID(), operation, principal,
  });
  return { activate, bindings, events, code, advance: (ms) => { now = new Date(now.getTime() + ms); } };
}

test("guest recovery/transfer preserve expiry; later login cannot claim; revoked browser fails closed", async () => {
  const h = activationHarness();
  const guest = { type: "guest", sessionToken: "A".repeat(43) };
  const first = await h.activate(guest);
  assert.equal(first.grant.principalType, "guest");
  assert.equal(first.grant.expiresAt - first.grant.startsAt, 7 * 86_400_000);
  h.advance(86_400_000);
  assert.equal((await h.activate(guest)).outcome, "already_active");
  await assert.rejects(h.activate({ type: "account", user }), /code_used/);
  const second = { type: "guest", sessionToken: "B".repeat(43) };
  await assert.rejects(h.activate(second), /browser_limit_reached/);
  const transferred = await h.activate(second, "transfer");
  assert.equal(transferred.outcome, "transferred");
  assert.equal(transferred.grant.expiresAt, first.grant.expiresAt);
  await assert.rejects(h.activate(guest), /session_revoked/);
  await assert.rejects(h.activate({ type: "guest", sessionToken: "C".repeat(43) }, "transfer"), /transfer_too_soon/);
  assert.equal(h.events.filter((e) => e.type === "activated").length, 1);
  assert.equal(h.bindings.filter((b) => !b.revokedAt).length, 1);
});

test("guest recovery can fill an available browser slot without renewing a grant", async () => {
  const h = activationHarness();
  h.code.maxBrowserSessions = 2;
  const first = await h.activate({ type: "guest", sessionToken: "A".repeat(43) });
  const recovered = await h.activate({ type: "guest", sessionToken: "B".repeat(43) }, "recover");
  assert.equal(recovered.outcome, "recovered");
  assert.equal(recovered.grant.expiresAt, first.grant.expiresAt);
  assert.equal(h.bindings.filter((b) => !b.revokedAt).length, 2);
});

test("signed-in first activation is account-bound without browser bindings", async () => {
  const h = activationHarness();
  const first = await h.activate({ type: "account", user });
  assert.equal(first.grant.userId, user.id);
  assert.equal(first.grant.principalType, "account");
  assert.equal(first.guestSessionToken, null);
  assert.equal(h.bindings.length, 0);
  assert.equal((await h.activate({ type: "account", user })).outcome, "already_active");
  await assert.rejects(h.activate({ type: "guest", sessionToken: "A".repeat(43) }), /code_used/);
});

test("inactivity does not expire an active guest grant early, but recovery never renews an expired grant", async () => {
  const h = activationHarness();
  const guest = { type: "guest", sessionToken: "A".repeat(43) };
  await h.activate(guest);
  h.advance(6 * 86_400_000);
  assert.equal((await h.activate(guest)).outcome, "already_active");
  h.advance(86_400_000);
  await assert.rejects(h.activate(guest), /code_used/);
  assert.equal(h.events.filter((event) => event.type === "activated").length, 1);
});

test("Telegram keeps its explicit account identity when a former guest signs in; no automatic claim", async () => {
  const principal = moduleLoader({
    "@/lib/auth-helpers": { getCurrentUser: async () => user },
    "@/lib/prisma": { prisma: new Proxy({}, { get() { throw new Error("unexpected guest lookup"); } }) },
    "@/lib/server/code-access-cookie": { guestAccessTokenFromRequest() { throw new Error("unexpected cookie fallback"); } },
  })("src/lib/server/telegram/request-principal.ts");
  assert.deepEqual(await principal.resolveTelegramRequestPrincipal(new Request(origin), "subject"), {
    type: "account", user: { id: user.id, sessionVersion: 0 },
  });
});

test("guest cookie is persistent, server-only and valid until session expiry, independently of anonymous quiz state", async () => {
  const expiresAt = new Date(Date.now() + 30 * 86_400_000);
  const token = "A".repeat(43);
  const cookie = moduleLoader({
    "@/lib/prisma": { prisma: { guestAccessSession: { findUnique: async () => ({ expiresAt, revokedAt: null }) } } },
    "next/headers": {},
  }, { process: { env: { NODE_ENV: "production" } } })("src/lib/server/code-access-cookie.ts");
  const header = cookie.guestAccessCookieHeader(token, expiresAt);
  for (const part of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age=", "Expires="]) assert.ok(header.includes(part));
  assert.ok(header.includes(expiresAt.toUTCString()));
  const reopened = new Request(origin, { headers: { cookie: header.split(";")[0] } });
  assert.equal(await cookie.activeGuestAccessTokenFromRequest(reopened), token);
  assert.equal(await cookie.activeGuestAccessTokenFromRequest(new Request(origin)), null);
});

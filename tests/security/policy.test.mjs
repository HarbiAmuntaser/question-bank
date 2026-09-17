import test from "node:test";
import assert from "node:assert/strict";
import { moduleLoader, authHarness } from "../admin/load-module.mjs";
import { NextRequest } from "next/server.js";

const id = "90000000-0000-4000-8000-000000000001";
const origin = "https://example.test";
const change = { reason: "Security incident reviewed", expectedUpdatedAt: "2026-09-14T00:00:00.000Z" };
const plan = { scopeType: "subject", subjectId: id, title: "Test plan", description: null, price: "100", currency: "SAR",
  isActive: false, whatsappNumber: "966500000000", telegramUsername: null, contactMessage: null, defaultDurationDays: 30, defaultMaxUses: 1 };

test("R2 strict metadata rejects missing/blank/oversized reasons and client actor/audit fields", () => {
  const { paymentAdminChangeSchema: schema } = moduleLoader()("src/validations/payment-admin.ts");
  for (const reason of [undefined, "   ", "x".repeat(1001)]) assert.equal(schema.safeParse({ ...change, reason }).success, false);
  for (const key of ["actorId", "actorSessionVersion", "role", "before", "after", "isActive"]) assert.equal(schema.safeParse({ ...change, [key]: "forged" }).success, false);
  assert.equal(schema.parse(change).reason, change.reason);
});

test("R2 payment admin services independently reject every non-admin identity", async () => {
  for (const role of [null, "student", "editor", "moderator"]) {
    const load = moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": { getCurrentUser: async () => role ? { id: "actor", role, isActive: true, sessionVersion: 0 } : null } }, { process: { env: { PAYMENT_CODES_ENABLED: "true" } } });
    const service = load("src/lib/server/payment-admin.ts");
    for (const name of ["disablePaymentPlan", "disablePaymentCode", "revokePaymentEntitlement"]) await assert.rejects(service[name](id, change), /forbidden|unauthorized/);
    await assert.rejects(service.savePaymentPlan(plan, change), /forbidden|unauthorized/);
    await assert.rejects(service.issuePaymentCode({ planId: id, maxUses: 1, durationDays: 1, startsAt: null, expiresAt: null, note: null }, change.reason), /forbidden|unauthorized/);
  }
});

test("R2 rechecks active admin role and sessionVersion within the transaction", async () => {
  const load = moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {} });
  const { recheckPaymentAdmin } = load("src/lib/server/payment-admin-auth.ts");
  for (const row of [null, { role: "admin", isActive: false, sessionVersion: 0 }, { role: "editor", isActive: true, sessionVersion: 0 }, { role: "admin", isActive: true, sessionVersion: 1 }]) {
    await assert.rejects(recheckPaymentAdmin({ user: { findUnique: async () => row } }, { id: "actor", sessionVersion: 0 }), /forbidden/);
  }
});

test("R2 Server Actions reject missing/cross-origin and sibling-origin submissions before rate-limit or writes", async () => {
  let calls = 0;
  for (const requestHeaders of [new Headers(), new Headers({ origin: "https://evil.example" }), new Headers({ origin, "sec-fetch-site": "same-site" }), new Headers({ origin, "sec-fetch-site": "cross-site" })]) {
    const load = moduleLoader({ "next/headers": { headers: async () => requestHeaders }, "@/lib/server/auth-config": { authOrigin: () => origin },
      "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {}, "@/lib/server/auth-rate-limit": { requestIdentity: () => "shared", consumeAuthLimit: async () => { calls++; } } });
    await assert.rejects(load("src/lib/server/payment-admin-action.ts").protectPaymentAdminAction("actor"), /forbidden/);
  }
  assert.equal(calls, 0);
});

test("R2 Server Action limiter failures fail closed; reads have independent buckets", async () => {
  const calls = []; let unavailable = false;
  const load = moduleLoader({ "next/headers": { headers: async () => new Headers({ origin }) }, "@/lib/server/auth-config": { authOrigin: () => origin },
    "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {}, "@/lib/server/auth-rate-limit": { requestIdentity: () => "shared", consumeAuthLimit: async (...args) => { if (unavailable) throw new Error("offline"); calls.push(args); } } });
  const guard = load("src/lib/server/payment-admin-action.ts").protectPaymentAdminAction;
  await guard("actor", false); await guard("actor", true);
  assert.notEqual(calls[0][0], calls[2][0]); assert.notEqual(calls[1][0], calls[3][0]);
  assert.equal(calls[1][3], 60); assert.equal(calls[3][3], 900);
  unavailable = true; await assert.rejects(guard("actor"), /offline/);
});

test("R2 payment-review read requests cannot shorten the financial write throttle window", async () => {
  const calls = [];
  const load = moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {},
    "@/lib/server/auth-rate-limit": { consumeAuthLimit: async (...args) => calls.push(args), requestIdentity: () => "shared", AuthRateLimitError: class extends Error {} },
    "@/lib/server/payment-http": { paymentJson: (body) => Response.json(body), requirePaymentOrigin() {}, readPaymentBody: async () => ({}) },
    "@/lib/server/payment-reviews": { listAdminOrders: async () => [], reviewOrder: async () => ({}) } }, { process: { env: { PAYMENT_REVIEW_ENABLED: "true" } } });
  const http = load("src/lib/server/payment-review-http.ts").adminReviewHttp;
  await http(new Request(origin), "actor"); await http(new Request(origin, { method: "POST" }), "actor", id);
  assert.deepEqual(calls[1], ["payment-review-admin:read", "actor", 120, 60]);
  assert.deepEqual(calls[3], ["payment-review-admin:write", "actor", 60, 900]);
});

test("R2 audit page denies students, editors, moderators and unauthenticated visitors", async () => {
  for (const role of ["student", "editor", "moderator"]) {
    const h = authHarness({ role });
    await assert.rejects(h.load("src/app/admin/subscriptions/audit/page.tsx").default({ searchParams: Promise.resolve({}) }), /REDIRECT:/);
    assert.equal(h.state.sideEffects, 0);
  }
  const h = authHarness({ signedIn: false });
  await assert.rejects(h.load("src/app/admin/subscriptions/audit/page.tsx").default({ searchParams: Promise.resolve({}) }), /REDIRECT:/);
  assert.equal(h.state.sideEffects, 0);
});

test("R2 subscriptions and audit are private, noindex, no-referrer and excluded from current and surviving telemetry", async () => {
  const middleware = moduleLoader({ "next-auth/jwt": { getToken: async () => ({ sub: "admin", role: "admin" }) } })("src/middleware.ts").default;
  let path = "/admin/subscriptions";
  const telemetry = moduleLoader({ "next/navigation": { usePathname: () => path } }, { window: { location: { origin } } })("src/components/site-telemetry.tsx");
  for (const route of ["/admin/subscriptions?tab=entitlements", "/admin/subscriptions/audit?page=2"]) {
    const response = await middleware(new NextRequest(origin + route));
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer"); assert.match(response.headers.get("x-robots-tag"), /noindex/);
    path = route.split("?")[0]; assert.equal(telemetry.SiteTelemetry(), null);
  }
  path = "/SA/universities";
  const beforeSend = telemetry.SiteTelemetry().props.children[0].props.beforeSend;
  assert.equal(beforeSend({ url: "/admin/subscriptions/audit?page=2" }), null);
  assert.deepEqual(beforeSend({ url: path }), { url: path });
});

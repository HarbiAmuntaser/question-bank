import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server.js";
import { authHarness, moduleLoader } from "../admin/load-module.mjs";
const schemas = moduleLoader()("src/validations/payment-review.ts");
const base = { expectedVersion: 0, idempotencyKey: randomUUID() };

test("student review submission accepts no money, proof, role, state or internal notes", () => {
  assert.equal(schemas.reviewSubmissionSchema.safeParse(base).success, true);
  for (const key of ["amount", "verifiedAmount", "reference", "role", "userId", "actorId", "status", "internalNote", "studentMessage", "proof", "entitlementId"]) {
    assert.equal(schemas.reviewSubmissionSchema.safeParse({ ...base, [key]: "injected" }).success, false);
  }
});
test("admin review uses strict fixed-point amounts, explicit reasons and optimistic versions", () => {
  const valid = { ...base, action: "receipt", amount: "10.01", reference: "Bank/TEST-12", internalNote: "Verified by administrator" };
  assert.equal(schemas.adminReviewSchema.parse(valid).reference, "bank/test-12");
  for (const amount of ["0", "-1", "1e2", "NaN", "Infinity", "1.001", "100000000", "01", 10, "10,00"]) assert.equal(schemas.adminReviewSchema.safeParse({ ...valid, amount }).success, false);
  for (const patch of [{ expectedVersion: -1 }, { expectedVersion: 0.1 }, { internalNote: "  " }, { role: "admin" }, { reference: "<script>" }, { status: "approved" }]) {
    assert.equal(schemas.adminReviewSchema.safeParse({ ...valid, ...patch }).success, false);
  }
  for (const action of ["rejected", "additional_requested"]) assert.equal(schemas.adminReviewSchema.safeParse({ ...base, action, internalNote: "private" }).success, false);
  assert.equal(schemas.adminReviewSchema.safeParse({ ...base, action: "approved", internalNote: "reviewed", amount: "1" }).success, false);
  assert.equal(schemas.adminReviewSchema.safeParse({ ...base, action: "correction", entryId: randomUUID(), amount: "0", internalNote: "incorrect entry" }).success, true);
});
test("financial history and submitted reviews never age into expired", () => {
  const service = moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {} })("src/lib/server/payment-orders.ts");
  assert.equal(service.effectiveOrderStatus({ status: "pending_payment", expiresAt: new Date(0), _count: { ledger: 1 } }), "pending_payment");
  assert.equal(service.effectiveOrderStatus({ status: "pending_payment", expiresAt: new Date(0), reviewStartedAt: new Date(0) }), "pending_payment");
  for (const status of ["pending_review", "awaiting_additional_payment"]) assert.equal(service.effectiveOrderStatus({ status, expiresAt: new Date(0) }), status);
});
test("editor, moderator and student are excluded from both payment order APIs and pages", async () => {
  for (const role of ["student", "editor", "moderator"]) {
    const h = authHarness({ role });
    for (const file of ["src/app/api/v1/admin/payment-orders/route.ts", "src/app/api/v1/admin/payment-orders/[id]/route.ts"]) {
      const route = h.load(file);
      for (const method of ["GET", "POST"].filter((name) => route[name])) assert.equal((await route[method](new Request("http://localhost/api/v1/admin/payment-orders", { method }), { params: Promise.resolve({ id: randomUUID() }) })).status, 403);
    }
    for (const file of ["src/app/admin/payment-orders/page.tsx", "src/app/admin/payment-orders/[id]/page.tsx"]) await assert.rejects(h.load(file).default({ params: Promise.resolve({ id: randomUUID() }), searchParams: Promise.resolve({}) }), /REDIRECT:\/auth\/forbidden/);
    assert.equal(h.state.sideEffects, 0);
  }
});
test("applied P2, P3 and P4 migration files retain their original bytes", () => {
  const hashes = {
    "20260910090000_add_student_role": "495882136e9a174dead7a0c3745bd44439af40cd01845e70167f40e28a502480",
    "20260910090100_student_accounts": "9710be5089bb617359908e89297ae72061dc00a9a4c5b43d424ddafddf32bf47",
    "20260911090000_account_subject_payments": "99e56d917086d2fef19726f8c71fb0e3775bad8d1fe53b11284265809b1ebfe1",
    "20260912090000_payment_orders": "36e3ba48f99d838186bd8b25463b4f00a641c858dc79a71b268cddf4fe7f9703",
  };
  for (const [name, hash] of Object.entries(hashes)) assert.equal(createHash("sha256").update(readFileSync(`prisma/migrations/${name}/migration.sql`)).digest("hex"), hash, name);
});
test("explicit PostgreSQL lock conflicts retry with a fresh transaction and a bounded limit", async () => {
  for (const code of ["40001", "40P01"]) {
    let attempts = 0;
    const conflict = new Prisma.PrismaClientKnownRequestError("raw lock conflict", { code: "P2010", clientVersion: "test", meta: { code } });
    const prisma = { $transaction: async (work) => { attempts++; if (attempts === 1) throw conflict; return work({}); } };
    const { paymentTransaction } = moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": {} })("src/lib/server/payment-mutations.ts");
    assert.equal(await paymentTransaction(async () => "ok"), "ok"); assert.equal(attempts, 2);
    attempts = 0; prisma.$transaction = async () => { attempts++; throw conflict; };
    await assert.rejects(paymentTransaction(async () => "must not run"), /payment_conflict_retry/); assert.equal(attempts, 3);
  }
});
test("admin payment searches and detail URLs are private, no-referrer, noindex and excluded from telemetry", async () => {
  const middleware = moduleLoader({ "next-auth/jwt": { getToken: async () => ({ sub: "admin", role: "admin" }) } })("src/middleware.ts").default;
  const response = await middleware(new NextRequest("http://localhost/admin/payment-orders?q=student%40example.test"));
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer"); assert.match(response.headers.get("x-robots-tag"), /noindex/);
  let path = "/admin/payment-orders";
  const telemetry = moduleLoader({ "next/navigation": { usePathname: () => path } }, { window: { location: { origin: "https://example.test" } } })("src/components/site-telemetry.tsx");
  assert.equal(telemetry.SiteTelemetry(), null);
  path = `/admin/payment-orders/${randomUUID()}`; assert.equal(telemetry.SiteTelemetry(), null);
  path = "/SA/universities";
  const beforeSend = telemetry.SiteTelemetry().props.children[0].props.beforeSend;
  assert.equal(beforeSend({ url: "/admin/payment-orders?q=student@example.test" }), null);
  assert.deepEqual(beforeSend({ url: "/SA/universities" }), { url: "/SA/universities" });
});

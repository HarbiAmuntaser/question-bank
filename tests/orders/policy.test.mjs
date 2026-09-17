import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { moduleLoader } from "../admin/load-module.mjs";
const load = moduleLoader();
const schemas = load("src/validations/payment-order.ts");
const valid = { planIds: [randomUUID()], contactMethod: "whatsapp", quoteVersion: "a".repeat(64), idempotencyKey: randomUUID() };

test("order input never accepts client money, identity, scope, recipient or status", () => {
  assert.equal(schemas.createOrderSchema.safeParse(valid).success, true);
  for (const field of ["userId", "role", "countryCode", "institutionType", "subjectId", "total", "price", "currency", "durationDays", "contactValue", "status", "expiresAt", "reference"]) {
    assert.equal(schemas.createOrderSchema.safeParse({ ...valid, [field]: "attacker" }).success, false, field);
  }
  for (const planIds of [[], [""], [valid.planIds[0], valid.planIds[0]], Array.from({ length: 11 }, () => randomUUID())]) {
    assert.equal(schemas.orderQuoteSchema.safeParse({ planIds }).success, false);
  }
  assert.equal(schemas.createOrderSchema.safeParse({ ...valid, contactMethod: "email" }).success, false);
  assert.equal(schemas.createOrderSchema.safeParse({ ...valid, idempotencyKey: "not-a-uuid" }).success, false);
  assert.equal(schemas.createOrderSchema.safeParse({ ...valid, quoteVersion: "stale" }).success, false);
  assert.equal(schemas.emptyOrderActionSchema.safeParse({ status: "approved" }).success, false);
});

test("expiry affects pending orders only and reads do not mutate state", () => {
  const orders = moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {}, "@/lib/server/payment-mutations": {} })("src/lib/server/payment-orders.ts");
  const now = new Date();
  const pending = { status: "pending_payment", expiresAt: now };
  assert.equal(orders.effectiveOrderStatus(pending, now), "expired");
  assert.equal(pending.status, "pending_payment");
  for (const status of ["cancelled", "approved", "rejected", "pending_review", "awaiting_additional_payment"]) {
    assert.equal(orders.effectiveOrderStatus({ status, expiresAt: new Date(0) }, now), status);
  }
});

test("disabled public order operations return 503 before any auth or database query", async () => {
  const unavailable = new Proxy({}, { get() { throw new Error("unexpected_database_call"); } });
  for (const flag of [undefined, "false", "TRUE", "1"]) {
    const http = moduleLoader({ "@/lib/prisma": { prisma: unavailable }, "@/lib/auth-helpers": { getCurrentUser() { throw new Error("unexpected_auth"); } } },
      { process: { env: { PAYMENT_V1_ENABLED: flag } } })("src/lib/server/payment-order-http.ts");
    for (const action of ["catalog", "quote", "create", "contact"]) {
      const response = await http.orderHttp(new Request("https://example.test/api/v1/student/orders", { method: "POST" }), action);
      assert.equal(response.status, 503);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.equal((await response.json()).error, action === "contact" ? "payment_review_unavailable" : "payments_unavailable");
    }
  }
});

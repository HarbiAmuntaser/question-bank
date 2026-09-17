import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f as sharedFixtures } from "../payments/fixtures.mjs";
const f = { ...sharedFixtures, alice: randomUUID(), bob: randomUUID() };
const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
let actorId = f.alice;
const forUser = (getId, globals = {}, dbClient = prisma) => moduleLoader({ "@/lib/prisma": { prisma: dbClient }, "@/lib/auth-helpers": {
  getCurrentUser: async () => getId() ? prisma.user.findUnique({ where: { id: getId() } }) : null,
} }, globals);
const load = forUser(() => actorId);
const orders = load("src/lib/server/payment-orders.ts");
const http = load("src/lib/server/payment-order-http.ts");
const origin = process.env.NEXTAUTH_URL;
const contact = { whatsappNumber: "+966500000000", telegramUsername: "@PaymentTest" };
const plan2 = randomUUID(); const duplicate = randomUUID();
const inputFor = async (planIds = [f.plan], method = "whatsapp", service = orders) => ({ planIds, contactMethod: method,
  quoteVersion: (await service.quoteOrder({ planIds })).version, idempotencyKey: randomUUID() });
const req = (action, body, headers = {}) => new Request(`${origin}/api/v1/student/orders${action === "create" ? "" : "/" + action}`, {
  method: ["get", "list", "catalog"].includes(action) ? "GET" : "POST", headers: { origin, "content-type": "application/json", ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
let count = 0;
async function check(name, test) { await test(); console.log(`PASS P4 ${++count}: ${name}`); }
try {
  process.env.PAYMENT_V1_ENABLED = "true";
  process.env.PAYMENT_REVIEW_ENABLED = "true";
  process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([f.plan, plan2, duplicate, f.yePlan, f.academyPlan, f.majorPlan]);
  // P5 disallows ordering subjects with active grants. Keep P4 customers independent of P3 grant tests.
  for (const id of [f.alice, f.bob]) await prisma.user.create({ data: { id, email: `${id}@p4.example.test`, normalizedEmail: `${id}@p4.example.test`, password: "unused-test-hash", role: "student", emailVerified: new Date() } });
  await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { ...contact, price: "0.10", currency: "SAR", defaultDurationDays: 30 } });
  await prisma.paidAccessPlan.create({ data: { id: plan2, title: "Second subject", scopeType: "subject", subjectId: f.sa2, price: "0.20", defaultDurationDays: 60, ...contact } });
  await prisma.paidAccessPlan.create({ data: { id: duplicate, title: "Alternate plan", scopeType: "subject", subjectId: f.sa, price: "0.10", ...contact } });
  const grantBefore = await prisma.accessEntitlement.findMany({ orderBy: { id: "asc" } });
  const codesBefore = await prisma.subscriptionCode.findMany({ orderBy: { id: "asc" } });
  await check("catalog and quotes derive Saudi university scope; mixed/outside/unknown plans fail atomically", async () => {
    const catalog = await orders.orderCatalog({});
    assert.ok(catalog.some((p) => p.planId === plan2));
    assert.ok(catalog.every((p) => [f.plan, plan2, duplicate].includes(p.planId)));
    for (const planId of [f.yePlan, f.academyPlan, f.majorPlan, randomUUID()]) {
      process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([...JSON.parse(process.env.PAYMENT_LAUNCH_PLAN_IDS), planId]);
      await assert.rejects(orders.quoteOrder({ planIds: [f.plan, planId] }), /payment_scope_not_allowed/);
      await assert.rejects(orders.createOrder({ ...await inputFor(), planIds: [f.plan, planId] }), /payment_scope_not_allowed/);
    }
    await assert.rejects(orders.quoteOrder({ planIds: [f.plan, duplicate] }), /duplicate_subject/);
    const quote = await orders.quoteOrder({ planIds: [plan2, f.plan] });
    assert.equal(quote.total, "0.30"); assert.equal(quote.currency, "SAR"); assert.equal(quote.validForHours, 24);
    assert.deepEqual(quote.methods, ["whatsapp", "telegram"]);
    assert.equal(quote.version, (await orders.quoteOrder({ planIds: [f.plan, plan2] })).version);
  });
  await check("only verified active students can read or create, with session version checked again in transaction", async () => {
    const input = await inputFor();
    for (const id of [null, "legacy-admin", "legacy-editor", "legacy-moderator", f.unverified]) {
      actorId = id;
      for (const run of [() => orders.quoteOrder({ planIds: [f.plan] }), () => orders.createOrder(input), () => orders.listOrders({})]) await assert.rejects(run(), /student_signin_required/);
    }
    actorId = f.alice;
    const stale = await prisma.user.findUnique({ where: { id: actorId } });
    const revoked = moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": { getCurrentUser: async () => stale } })("src/lib/server/payment-orders.ts");
    await prisma.user.update({ where: { id: actorId }, data: { sessionVersion: { increment: 1 } } });
    await assert.rejects(revoked.createOrder(input), /student_signin_required/);
    await prisma.user.update({ where: { id: actorId }, data: { isActive: false } });
    await assert.rejects(orders.createOrder(input), /student_signin_required/);
    await prisma.user.update({ where: { id: actorId }, data: { isActive: true } });
  });
  await check("invalid pricing and unavailable recipients are not silently accepted; quote changes require confirmation", async () => {
    const input = await inputFor();
    for (const data of [{ price: null }, { price: "0" }, { price: "-1" }, { price: "1", currency: "USD" }]) {
      await prisma.paidAccessPlan.update({ where: { id: f.plan }, data });
      await assert.rejects(orders.quoteOrder({ planIds: [f.plan] }), /plan_not_orderable/);
    }
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { price: "0.11", currency: "SAR" } });
    await assert.rejects(orders.createOrder(input), /quote_changed/);
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { price: "0.10" } });
    await prisma.paidAccessPlan.update({ where: { id: plan2 }, data: { whatsappNumber: "966511111111", telegramUsername: null } });
    const mixed = await inputFor([f.plan, plan2]);
    assert.deepEqual((await orders.quoteOrder({ planIds: mixed.planIds })).methods, []);
    await assert.rejects(orders.createOrder(mixed), /contact_unavailable/);
    await prisma.paidAccessPlan.update({ where: { id: plan2 }, data: contact });
  });
  let input; let saved;
  await check("five concurrent same-key submissions create exactly one balanced order and one event", async () => {
    input = await inputFor([f.plan, plan2]);
    const results = await Promise.all(Array.from({ length: 5 }, () => orders.createOrder(input)));
    assert.equal(new Set(results.map((r) => r.order.id)).size, 1);
    assert.equal(results.filter((r) => !r.alreadyCreated).length, 1);
    saved = results[0].order;
    assert.equal(saved.total, "0.30"); assert.equal(saved.items.length, 2); assert.equal(saved.status, "pending_payment");
    assert.match(saved.reference, /^MW-\d{4}-[A-F0-9]{10}$/);
    assert.equal(new Date(saved.expiresAt) - new Date(saved.createdAt), 24 * 3600000);
    const row = await prisma.paymentOrder.findUnique({ where: { id: saved.id }, include: { items: true, events: true } });
    assert.equal(row.userId, f.alice); assert.equal(row.events.length, 1); assert.equal(row.events[0].actorId, f.alice);
    assert.equal(row.contactValue, "966500000000");
    for (const field of ["userId", "contactValue", "requestHash", "idempotencyKey"]) assert.equal(Object.hasOwn(saved, field), false);
    await assert.rejects(orders.createOrder({ ...input, contactMethod: "telegram" }), /idempotency_key_reused/);
    await assert.rejects(orders.createOrder({ ...input, idempotencyKey: randomUUID() }), (e) => e.code === "active_order_exists" && e.orderId === saved.id);
  });
  await check("owned list, get, cancel and contact resist IDOR; separate accounts can order the same cart", async () => {
    const bob = forUser(() => f.bob)("src/lib/server/payment-orders.ts");
    for (const run of [() => bob.getOrder(saved.id), () => bob.contactOrder(saved.id), () => bob.cancelOrder(saved.id)]) await assert.rejects(run(), (e) => e.status === 404);
    assert.equal((await bob.listOrders({})).items.length, 0);
    const other = await bob.createOrder(input);
    assert.notEqual(other.order.id, saved.id); assert.notEqual(other.order.reference, saved.reference);
    assert.deepEqual((await bob.listOrders({})).items.map((o) => o.id), [other.order.id]);
    await bob.cancelOrder(other.order.id);
  });
  await check("saved pricing/duration survives edits; contact is recorded once and sends no account PII or entitlement", async () => {
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { price: "999", defaultDurationDays: 90, title: "Changed title" } });
    assert.deepEqual((await orders.getOrder(saved.id)).items, saved.items);
    const links = await Promise.all(Array.from({ length: 4 }, () => orders.contactOrder(saved.id)));
    assert.ok(links.every((link) => link.href === links[0].href));
    const handoff = links[0];
    assert.match(handoff.href, /^https:\/\/wa\.me\/966500000000\?text=/); assert.ok(handoff.message.includes(saved.reference));
    assert.ok(handoff.message.includes("0.30 SAR")); assert.ok(!handoff.message.includes("999"));
    for (const pii of [f.alice, "alice@p3.example.test", "alice"]) assert.ok(!handoff.message.includes(pii));
    assert.equal(await prisma.paymentOrderEvent.count({ where: { orderId: saved.id, type: "contact_requested" } }), 1);
    assert.equal((await orders.getOrder(saved.id)).status, "pending_payment");
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { whatsappNumber: "966522222222" } });
    await assert.rejects(orders.contactOrder(saved.id), /contact_changed/);
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { ...contact, price: "0.10", defaultDurationDays: 30, title: "Legacy plan", isActive: false } });
    await assert.rejects(orders.contactOrder(saved.id), /contact_changed/);
    await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { isActive: true } });
  });
  await check("database guards preserve snapshots, append-only audit, state transitions and financial history", async () => {
    for (const data of [{ total: "0.01" }, { userId: f.bob }, { expiresAt: new Date(0) }, { contactValue: "attacker" }, { status: "approved", activeCartKey: null }, { status: "pending_review" }, { status: "expired", activeCartKey: null }]) {
      await assert.rejects(prisma.paymentOrder.update({ where: { id: saved.id }, data }));
    }
    await assert.rejects(prisma.paymentOrder.update({ where: { id: saved.id }, data: { status: "cancelled", activeCartKey: null } }));
    await assert.rejects(prisma.paymentOrderItem.updateMany({ where: { orderId: saved.id }, data: { price: "0.01" } }));
    await assert.rejects(prisma.paymentOrderItem.deleteMany({ where: { orderId: saved.id } }));
    await assert.rejects(prisma.paymentOrderEvent.updateMany({ where: { orderId: saved.id }, data: { actorId: f.bob } }));
    await assert.rejects(prisma.paymentOrderEvent.deleteMany({ where: { orderId: saved.id } }));
    await assert.rejects(prisma.paymentOrder.delete({ where: { id: saved.id } }));
    for (const [model, id] of [["user", f.alice], ["subject", f.sa], ["paidAccessPlan", f.plan]]) await assert.rejects(prisma[model].delete({ where: { id } }));
    const row = await prisma.paymentOrder.findUnique({ where: { id: saved.id }, include: { items: true } });
    const { id, items, ...data } = row;
    const newData = () => ({ ...data, reference: randomUUID(), idempotencyKey: randomUUID(), cartKey: randomUUID(), activeCartKey: null,
      contactRequestedAt: null, events: { create: { type: "created", actorId: f.alice } } });
    async function badOrder(changes = {}, itemChanges = {}) {
      const next = newData(); next.activeCartKey = next.cartKey;
      return prisma.paymentOrder.create({ data: { ...next, ...changes, items: { create: items.map(({ id, orderId, ...item }) => ({ ...item, ...itemChanges })) } } });
    }
    await assert.rejects(badOrder({ total: "4" }));
    await assert.rejects(badOrder({ events: undefined }));
    await assert.rejects(badOrder({ userId: "legacy-admin" }));
    await assert.rejects(badOrder({}, { subjectId: f.ye, planId: f.yePlan }));
    await assert.rejects(badOrder({}, { price: new Prisma.Decimal("0.01") }));
    await assert.rejects(badOrder({}, { durationDays: 500 }));
    await assert.rejects(badOrder({}, { subjectName: "Fake subject" }));
    assert.equal((await orders.getOrder(saved.id)).status, "pending_payment");
  });
  await check("closed release still allows own history and cancellation, with idempotent terminal retries", async () => {
    process.env.PAYMENT_V1_ENABLED = "false";
    process.env.PAYMENT_REVIEW_ENABLED = "false";
    assert.equal((await orders.getOrder(saved.id)).canContact, false);
    assert.equal((await orders.listOrders({})).items.length, 1);
    for (const action of ["create", "quote", "catalog", "contact"]) assert.equal((await http.orderHttp(req(action, action === "catalog" ? undefined : {}), action, saved.id)).status, 503);
    const cancelled = await Promise.all(Array.from({ length: 4 }, () => orders.cancelOrder(saved.id)));
    assert.ok(cancelled.every((r) => r.status === "cancelled"));
    assert.equal(await prisma.paymentOrderEvent.count({ where: { orderId: saved.id, type: "cancelled" } }), 1);
    process.env.PAYMENT_V1_ENABLED = "true";
    process.env.PAYMENT_REVIEW_ENABLED = "true";
    assert.equal((await orders.createOrder(input)).order.status, "cancelled");
    await assert.rejects(orders.contactOrder(saved.id), /order_not_payable/);
  });
  await check("expired quotes cannot contact/cancel; a fresh order atomically releases the expired active cart", async () => {
    class PastDate extends Date {
      constructor(...args) { super(...(args.length ? args : [Date.now() - 2 * 86400000])); }
    }
    const past = forUser(() => f.alice, { Date: PastDate })("src/lib/server/payment-orders.ts");
    const oldInput = await inputFor([f.plan], "telegram", past);
    const old = (await past.createOrder(oldInput)).order;
    assert.equal((await orders.getOrder(old.id)).status, "expired");
    await assert.rejects(orders.contactOrder(old.id), /order_not_payable/);
    await assert.rejects(orders.cancelOrder(old.id), /order_not_cancellable/);
    assert.equal((await orders.createOrder(oldInput)).order.id, old.id);
    const fresh = await orders.createOrder({ ...oldInput, idempotencyKey: randomUUID() });
    assert.notEqual(fresh.order.id, old.id);
    assert.equal((await prisma.paymentOrder.findUnique({ where: { id: old.id } })).activeCartKey, null);
    assert.equal(await prisma.paymentOrderEvent.count({ where: { orderId: old.id, type: "expired", actorId: null } }), 1);
    const link = await orders.contactOrder(fresh.order.id); assert.equal(link.href, "https://t.me/paymenttest");
    await orders.cancelOrder(fresh.order.id);
  });
  await check("expiry and audit instants are independent of PostgreSQL session timezone", async () => {
    for (const zone of ["Asia/Riyadh", "America/Los_Angeles"]) {
      const zonedDb = new Proxy(prisma, { get(target, key) {
        if (key === "$transaction") return (fn, options) => prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT set_config('TimeZone', ${zone}, true)`;
          return fn(tx);
        }, options);
        return Reflect.get(target, key);
      } });
      function service(hoursAgo) {
        class ShiftedDate extends Date {
          constructor(...args) { super(...(args.length ? args : [Date.now() - hoursAgo * 3600000])); }
        }
        return forUser(() => f.alice, { Date: ShiftedDate }, zonedDb)("src/lib/server/payment-orders.ts");
      }
      const live = service(0); const input = await inputFor();
      const recent = (await service(22).createOrder(input)).order;
      assert.equal((await live.getOrder(recent.id)).status, "pending_payment");
      await live.contactOrder(recent.id);
      const event = await prisma.paymentOrderEvent.findUnique({ where: { orderId_type: { orderId: recent.id, type: "contact_requested" } } });
      assert.ok(Math.abs(event.createdAt.getTime() - Date.now()) < 10000, zone);
      assert.equal((await live.cancelOrder(recent.id)).status, "cancelled", zone);
      const oldInput = { ...input, idempotencyKey: randomUUID() };
      const old = (await service(26).createOrder(oldInput)).order;
      assert.equal((await live.getOrder(old.id)).status, "expired");
      const replacement = (await live.createOrder({ ...input, idempotencyKey: randomUUID() })).order;
      assert.equal((await prisma.paymentOrder.findUnique({ where: { id: old.id } })).status, "expired", zone);
      await live.cancelOrder(replacement.id);
    }
  });
  await check("different keys racing for the same cart cannot create two active orders", async () => {
    const input = await inputFor();
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => orders.createOrder({ ...input, idempotencyKey: randomUUID() })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.ok(results.filter((r) => r.status === "rejected").every((r) => r.reason.code === "active_order_exists"));
    await orders.cancelOrder(results.find((r) => r.status === "fulfilled").value.order.id);
  });
  await check("keyset pagination is stable and account-scoped, including attacker-supplied cursors", async () => {
    for (let i = 0; i < 21; i++) {
      const item = await orders.createOrder(await inputFor()); await orders.cancelOrder(item.order.id);
    }
    const first = await orders.listOrders({}); assert.equal(first.items.length, 20); assert.ok(first.nextCursor);
    const second = await orders.listOrders({ cursor: first.nextCursor }); assert.ok(second.items.length > 0);
    assert.equal(new Set([...first.items, ...second.items].map((o) => o.id)).size, first.items.length + second.items.length);
    const bob = forUser(() => f.bob)("src/lib/server/payment-orders.ts");
    assert.ok((await bob.listOrders({ cursor: first.nextCursor })).items.every((o) => ![...first.items, ...second.items].some((a) => a.id === o.id)));
    await assert.rejects(orders.listOrders({ cursor: "invalid" }), /invalid_cursor/);
  });
  await check("HTTP enforces CSRF, strict payload, body limits, ownership and distributed per-account throttles", async () => {
    await prisma.authRateLimit.deleteMany();
    const input = await inputFor();
    assert.equal((await http.orderHttp(req("create", input, { origin: "https://evil.test" }), "create")).status, 403);
    assert.equal((await http.orderHttp(req("create", input, { "content-type": "text/plain" }), "create")).status, 415);
    assert.equal((await http.orderHttp(req("quote", { planIds: [f.plan], total: 1 }), "quote")).status, 400);
    assert.equal((await http.orderHttp(req("quote", { planIds: ["x".repeat(9000)] }), "quote")).status, 413);
    assert.equal((await http.orderHttp(req("cancel", { status: "approved" }), "cancel", saved.id)).status, 400);
    const response = await http.orderHttp(req("create", input), "create"); assert.equal(response.status, 201);
    assert.match(response.headers.get("cache-control"), /private.*no-store/); assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    const created = (await response.json()).data.order;
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await http.orderHttp(req("create", input), "create")).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 429]);
    actorId = f.bob;
    assert.equal((await http.orderHttp(req("get"), "get", created.id)).status, 404);
    actorId = null;
    assert.equal((await http.orderHttp(req("list"), "list")).status, 401);
    actorId = f.alice; await orders.cancelOrder(created.id);
    await prisma.authRateLimit.deleteMany();
    const broken = moduleLoader({ "@/lib/prisma": { prisma: { $queryRaw() { throw new Error("rate_backend_down"); } } } })("src/lib/server/payment-order-http.ts");
    assert.equal((await broken.orderHttp(req("create", input), "create")).status, 503);
  });
  await check("P4 never grants access, consumes codes, rewrites legacy requests or approves payments", async () => {
    assert.deepEqual(await prisma.accessEntitlement.findMany({ orderBy: { id: "asc" } }), grantBefore);
    assert.deepEqual(await prisma.subscriptionCode.findMany({ orderBy: { id: "asc" } }), codesBefore);
    assert.equal(await prisma.paymentOrder.count({ where: { status: { in: ["approved", "pending_review", "awaiting_additional_payment", "rejected"] } } }), 0);
  });
  await prisma.authRateLimit.deleteMany();
  process.env.PAYMENT_V1_ENABLED = "false";
  console.log(`${count} P4 PostgreSQL/service acceptance groups passed`);
} finally { await prisma.$disconnect(); }

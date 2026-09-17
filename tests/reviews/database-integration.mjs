import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient, Prisma } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "../payments/fixtures.mjs";

const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
function forUser(id, client = prisma, globals = {}, identity) {
  const current = async () => identity ?? (id ? prisma.user.findUnique({ where: { id } }) : null);
  return moduleLoader({ "@/lib/prisma": { prisma: client }, "@/lib/auth-helpers": { getCurrentUser: current },
    "@/lib/auth": { authOptions: {} }, "next-auth": { getServerSession: async () => { const user = await current(); return user ? { user } : null; } } }, globals);
}
const adminLoad = forUser("legacy-admin"); const reviews = adminLoad("src/lib/server/payment-reviews.ts");
const plans = [f.plan, randomUUID()];
const contact = { whatsappNumber: "966500000000", telegramUsername: "paymenttest" };
let count = 0;
async function check(name, fn) {
  const watchdog = setTimeout(async () => {
    const diagnostic = new PrismaClient({ datasourceUrl: url.href });
    try { console.error("P5 waiting:", name, await diagnostic.$queryRaw`SELECT pid, state, wait_event_type, wait_event, left(query, 240) AS query FROM pg_stat_activity WHERE datname = current_database()`); }
    finally { await diagnostic.$disconnect(); }
  }, 30000);
  const deadline = setTimeout(() => { console.error("P5 test exceeded 90 seconds:", name); process.exit(1); }, 90000);
  try { await fn(); console.log(`PASS P5 ${++count}: ${name}`); }
  finally { clearTimeout(watchdog); clearTimeout(deadline); }
}
async function customer() {
  const id = randomUUID(); await prisma.user.create({ data: { id, email: `${id}@p5.example.test`, normalizedEmail: `${id}@p5.example.test`, password: "unused-test-hash", role: "student", emailVerified: new Date() } });
  return id;
}
async function create({ userId, planIds = [plans[0]], hoursAgo = 0 } = {}) {
  userId ??= await customer();
  class ShiftedDate extends Date { constructor(...args) { super(...(args.length ? args : [Date.now() - hoursAgo * 3600000])); } }
  const service = forUser(userId, prisma, { Date: ShiftedDate })("src/lib/server/payment-orders.ts");
  const input = { planIds, contactMethod: "whatsapp", quoteVersion: (await service.quoteOrder({ planIds })).version, idempotencyKey: randomUUID() };
  const order = (await service.createOrder(input)).order;
  return { userId, order, input, service: forUser(userId)("src/lib/server/payment-orders.ts"), student: forUser(userId)("src/lib/server/payment-reviews.ts") };
}
async function reviewInput(id, action, fields = {}) {
  const order = await prisma.paymentOrder.findUniqueOrThrow({ where: { id } });
  return { action, expectedVersion: order.reviewVersion, idempotencyKey: randomUUID(), internalNote: "PRIVATE verified review note", ...fields };
}
async function act(id, action, fields = {}, service = reviews) { return service.reviewOrder(id, await reviewInput(id, action, fields)); }
async function receipt(id, amount, reference = `bank/${randomUUID()}`) { return act(id, "receipt", { amount, reference }); }
async function grants(orderId) { return prisma.accessEntitlement.findMany({ where: { orderItem: { orderId } }, orderBy: { subjectId: "asc" } }); }
async function row(id) { return prisma.paymentOrder.findUniqueOrThrow({ where: { id } }); }
try {
  process.env.PAYMENT_V1_ENABLED = "true";
  process.env.PAYMENT_REVIEW_ENABLED = "true";
  process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify(plans);
  await prisma.paidAccessPlan.update({ where: { id: plans[0] }, data: { ...contact, price: "100", defaultDurationDays: 30, isActive: true } });
  await prisma.paidAccessPlan.create({ data: { id: plans[1], title: "P5 second subject", scopeType: "subject", subjectId: f.sa2, price: "50", defaultDurationDays: 60, ...contact } });
  const codesBefore = await prisma.subscriptionCode.findMany({ orderBy: { id: "asc" } });
  let first;
  await check("student submission stops 24h expiry but never verifies money or grants access; idempotent concurrent review", async () => {
    first = await create({ hoursAgo: 22 });
    const input = { expectedVersion: 0, idempotencyKey: randomUUID() };
    const results = await Promise.all(Array.from({ length: 5 }, () => first.student.submitOrderReview(first.order.id, input)));
    assert.ok(results.every((o) => o.status === "pending_review" && o.verifiedAmount === "0.00"));
    assert.equal(await prisma.paymentReviewEvent.count({ where: { orderId: first.order.id } }), 1);
    assert.equal(await prisma.paymentLedgerEntry.count({ where: { orderId: first.order.id } }), 0);
    assert.equal((await grants(first.order.id)).length, 0);
    class FutureDate extends Date { constructor(...args) { super(...(args.length ? args : [Date.now() + 30 * 86400000])); } }
    assert.equal((await forUser(first.userId, prisma, { Date: FutureDate })("src/lib/server/payment-orders.ts").getOrder(first.order.id)).status, "pending_review");
    await first.service.contactOrder(first.order.id);
    await assert.rejects(first.service.cancelOrder(first.order.id), /order_not_cancellable/);
    for (const patch of [{ amount: "100" }, { internalNote: "fake" }, { role: "admin" }]) await assert.rejects(first.student.submitOrderReview(first.order.id, { ...input, ...patch }));
    const other = forUser(await customer())("src/lib/server/payment-reviews.ts");
    await assert.rejects(other.submitOrderReview(first.order.id, input), (e) => e.status === 404);
  });
  await check("partial top-ups remain in review; student sees public messages only; full amount is not approval", async () => {
    await receipt(first.order.id, "40");
    assert.equal((await first.service.getOrder(first.order.id)).verifiedAmount, "40.00");
    assert.equal((await grants(first.order.id)).length, 0);
    await act(first.order.id, "additional_requested", { studentMessage: "PUBLIC remaining 60 SAR" });
    const view = await first.service.getOrder(first.order.id);
    assert.equal(view.status, "awaiting_additional_payment"); assert.equal(view.remainingAmount, "60.00");
    assert.match(JSON.stringify(view), /PUBLIC/); assert.doesNotMatch(JSON.stringify(view), /PRIVATE|internalNote|actorId|bank\//);
    assert.doesNotMatch(JSON.stringify(await first.service.listOrders({})), /PRIVATE|internalNote|actorId|bank\//);
    await first.student.submitOrderReview(first.order.id, { expectedVersion: view.reviewVersion, idempotencyKey: randomUUID() });
    await receipt(first.order.id, "60");
    assert.equal((await row(first.order.id)).status, "pending_review"); assert.equal((await grants(first.order.id)).length, 0);
    await assert.rejects(act(first.order.id, "rejected", { studentMessage: "declined" }), /settlement_required_before_rejection/);
  });
  await check("explicit concurrent approval creates one immutable item-owned grant using the frozen duration", async () => {
    await prisma.paidAccessPlan.update({ where: { id: plans[0] }, data: { price: "900", defaultDurationDays: 90 } });
    const input = await reviewInput(first.order.id, "approved");
    const result = await Promise.all(Array.from({ length: 5 }, () => reviews.reviewOrder(first.order.id, input)));
    assert.equal(result.filter((r) => !r.alreadyApplied).length, 1);
    const approved = await grants(first.order.id); assert.equal(approved.length, 1);
    assert.equal(approved[0].userId, first.userId); assert.equal(approved[0].codeId, null);
    assert.equal(approved[0].expiresAt - approved[0].startsAt, 30 * 86400000);
    await assert.rejects(prisma.accessEntitlement.update({ where: { id: approved[0].id }, data: { orderItemId: null } }));
    await assert.rejects(prisma.accessEntitlement.update({ where: { id: approved[0].id }, data: { expiresAt: new Date("2099-01-01") } }));
    await assert.rejects(prisma.accessEntitlement.delete({ where: { id: approved[0].id } }));
    await assert.rejects(create({ userId: first.userId }), /active_entitlement_exists/);
    await prisma.paidAccessPlan.update({ where: { id: plans[0] }, data: { price: "100", defaultDurationDays: 30 } });
  });
  await check("failure creating the second item rolls back first grant, approval event, version and status together", async () => {
    const item = await create({ planIds: plans }); await receipt(item.order.id, "150");
    const before = await row(item.order.id); const beforeEvents = await prisma.paymentReviewEvent.count({ where: { orderId: item.order.id } });
    const failing = new Proxy(prisma, { get(target, key) {
      if (key === "$transaction") return (work, options) => prisma.$transaction((tx) => {
        let created = 0;
        const wrapped = new Proxy(tx, { get(t, k) { if (k === "accessEntitlement") return new Proxy(t.accessEntitlement, { get(model, name) {
          if (name === "create") return (args) => { if (++created === 2) throw new Error("injected_second_grant_failure"); return model.create(args); };
          return Reflect.get(model, name);
        } }); return Reflect.get(t, k); } });
        return work(wrapped);
      }, options);
      return Reflect.get(target, key);
    } });
    await assert.rejects(act(item.order.id, "approved", {}, forUser("legacy-admin", failing)("src/lib/server/payment-reviews.ts")), /injected_second_grant_failure/);
    assert.deepEqual(await row(item.order.id), before); assert.equal((await grants(item.order.id)).length, 0);
    assert.equal(await prisma.paymentReviewEvent.count({ where: { orderId: item.order.id } }), beforeEvents);
    assert.equal((await item.service.getOrder(item.order.id)).verifiedAmount, "150.00");
    await act(item.order.id, "approved"); assert.equal((await grants(item.order.id)).length, 2);
  });
  await check("overpayment is retained with a blocked-approval audit until a separately verified manual refund", async () => {
    const item = await create(); await receipt(item.order.id, "110");
    const blocked = await act(item.order.id, "approved"); assert.equal(blocked.conflictCode, "overpayment_requires_settlement");
    assert.equal((await grants(item.order.id)).length, 0); assert.equal((await item.service.getOrder(item.order.id)).excessAmount, "10.00");
    assert.equal((await row(item.order.id)).status, "pending_review");
    await assert.rejects(act(item.order.id, "refund", { amount: "111", reference: `refund/${randomUUID()}` }), /refund_exceeds_balance/);
    await act(item.order.id, "refund", { amount: "10", reference: `refund/${randomUUID()}`, studentMessage: "تم رد المبلغ الزائد" });
    assert.equal((await row(item.order.id)).status, "pending_review"); assert.equal((await grants(item.order.id)).length, 0);
    await act(item.order.id, "approved"); assert.equal((await grants(item.order.id)).length, 1);
  });
  await check("corrections append void plus replacement, preserve originals and references, and allow repeated correction chains", async () => {
    const item = await create(); const reference = `bank/${randomUUID()}`; await receipt(item.order.id, "70", reference);
    const original = await prisma.paymentLedgerEntry.findUniqueOrThrow({ where: { reference } });
    await act(item.order.id, "correction", { entryId: original.id, amount: "40" });
    assert.deepEqual(await prisma.paymentLedgerEntry.findUnique({ where: { id: original.id } }), original);
    assert.equal((await item.service.getOrder(item.order.id)).verifiedAmount, "40.00");
    const replacement = await prisma.paymentLedgerEntry.findFirstOrThrow({ where: { sourceId: original.id, kind: "correction" } });
    await assert.rejects(act(item.order.id, "correction", { entryId: original.id, amount: "0" }), /ledger_entry_not_correctable/);
    await act(item.order.id, "correction", { entryId: replacement.id, amount: "0" });
    assert.equal((await item.service.getOrder(item.order.id)).verifiedAmount, "0.00");
    assert.equal((await row(item.order.id)).status, "pending_review");
    const other = await create(); await assert.rejects(receipt(other.order.id, "70", reference.toUpperCase()), /transfer_reference_used/);
    await assert.rejects(act(other.order.id, "correction", { entryId: original.id, amount: "0" }), /ledger_entry_not_correctable/);
    await act(item.order.id, "rejected", { studentMessage: "تم إغلاق الطلب بعد تصحيح السجل" });
    for (const model of ["paymentLedgerEntry", "paymentReviewEvent"]) {
      await assert.rejects(prisma[model].deleteMany({ where: { orderId: item.order.id } }));
      await assert.rejects(prisma[model].updateMany({ where: { orderId: item.order.id }, data: { createdAt: new Date(0) } }));
    }
  });
  await check("late documented transfers reopen expired/cancelled/rejected orders and retain overlapping financial conflicts", async () => {
    const old = await create({ hoursAgo: 26 });
    await assert.rejects(old.student.submitOrderReview(old.order.id, { expectedVersion: 0, idempotencyKey: randomUUID() }), /order_not_reviewable/);
    const fresh = await create({ userId: old.userId }); assert.equal((await row(old.order.id)).status, "expired");
    await receipt(old.order.id, "100"); assert.equal((await row(old.order.id)).status, "pending_review");
    assert.equal((await act(old.order.id, "approved")).conflictCode, "overlapping_order_exists");
    await assert.rejects(create({ userId: old.userId }), /active_order_exists/);
    await assert.rejects(prisma.paymentOrder.update({ where: { id: old.order.id }, data: { status: "expired", activeCartKey: null } }));
    await fresh.service.cancelOrder(fresh.order.id);
    await act(old.order.id, "approved");
    for (const state of ["cancelled", "rejected"]) {
      const item = await create();
      if (state === "cancelled") await item.service.cancelOrder(item.order.id);
      else { await item.student.submitOrderReview(item.order.id, { expectedVersion: 0, idempotencyKey: randomUUID() }); await act(item.order.id, "rejected", { studentMessage: "rejected before payment" }); }
      await receipt(item.order.id, "10"); assert.equal((await row(item.order.id)).status, "pending_review");
      assert.equal((await item.service.getOrder(item.order.id)).verifiedAmount, "10.00");
    }
  });
  await check("approval revalidates country, institution, subject, plan and account; conflicts preserve every verified amount", async () => {
    for (const [model, id, changed, restored] of [
      ["university", `u-${f.sa}`, { countryCode: "YE" }, { countryCode: "SA" }],
      ["university", `u-${f.sa}`, { institutionType: "academy" }, { institutionType: "university" }],
      ["subject", f.sa, { isActive: false }, { isActive: true }],
      ["major", `m-${f.sa}`, { isActive: false }, { isActive: true }],
      ["paidAccessPlan", plans[0], { isActive: false }, { isActive: true }],
    ]) {
      const item = await create({ planIds: plans }); await receipt(item.order.id, "150");
      await prisma[model].update({ where: { id }, data: changed });
      try { assert.equal((await act(item.order.id, "approved")).conflictCode, "payment_scope_not_allowed"); }
      finally { await prisma[model].update({ where: { id }, data: restored }); }
      assert.equal((await grants(item.order.id)).length, 0); assert.equal((await item.service.getOrder(item.order.id)).verifiedAmount, "150.00");
      await act(item.order.id, "approved");
    }
    const item = await create(); await receipt(item.order.id, "100");
    await prisma.user.update({ where: { id: item.userId }, data: { isActive: false } });
    assert.equal((await act(item.order.id, "approved")).conflictCode, "student_account_unavailable");
    assert.equal((await grants(item.order.id)).length, 0);
  });
  await check("no implicit renewal after an intervening grant, including a concurrent account grant writer", async () => {
    const item = await create(); await receipt(item.order.id, "100");
    let release; let locked;
    const gate = new Promise((r) => release = r); const ready = new Promise((r) => locked = r);
    const writer = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${item.userId} FOR UPDATE`; locked(); await gate;
      await tx.accessEntitlement.create({ data: { userId: item.userId, scopeType: "subject", subjectId: f.sa, startsAt: new Date(), isActive: true } });
    });
    await ready; const approving = act(item.order.id, "approved"); await delay(100); release(); await writer;
    assert.equal((await approving).conflictCode, "active_entitlement_exists");
    assert.equal((await grants(item.order.id)).length, 0);
    assert.equal((await item.service.getOrder(item.order.id)).verifiedAmount, "100.00");
    await assert.rejects(create({ userId: item.userId }), /active_order_exists|active_entitlement_exists/);
  });
  await check("two stale admins cannot apply different decisions or duplicate credit; approval versus refund is serialized", async () => {
    const item = await create(); const input = await reviewInput(item.order.id, "receipt", { amount: "100", reference: `bank/${randomUUID()}` });
    const results = await Promise.all(Array.from({ length: 5 }, () => reviews.reviewOrder(item.order.id, input)));
    assert.equal(results.filter((r) => !r.alreadyApplied).length, 1);
    await assert.rejects(reviews.reviewOrder(item.order.id, { ...input, amount: "200" }), /idempotency_key_reused/);
    const approve = await reviewInput(item.order.id, "approved");
    const refund = await reviewInput(item.order.id, "refund", { amount: "100", reference: `refund/${randomUUID()}` });
    const raced = await Promise.allSettled([reviews.reviewOrder(item.order.id, approve), reviews.reviewOrder(item.order.id, refund)]);
    assert.equal(raced.filter((r) => r.status === "fulfilled").length, 1);
    assert.match(raced.find((r) => r.status === "rejected").reason.message, /order_changed/);
    const current = await row(item.order.id); const view = await item.service.getOrder(item.order.id);
    assert.equal((await grants(item.order.id)).length, current.status === "approved" ? 1 : 0);
    assert.equal(view.verifiedAmount, current.status === "approved" ? "100.00" : "0.00");
  });
  await check("database rejects missing grants/audit, forged financial actors and mutable grant links", async () => {
    const item = await create(); await receipt(item.order.id, "100"); const before = await row(item.order.id);
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.paymentReviewEvent.create({ data: { orderId: item.order.id, actorId: "legacy-admin", actorSessionVersion: (await tx.user.findUnique({ where: { id: "legacy-admin" } })).sessionVersion,
        action: "approved", version: before.reviewVersion + 1, fromStatus: before.status, toStatus: "approved", idempotencyKey: randomUUID(), requestHash: "test", internalNote: "raw attempted approval" } });
      await tx.paymentOrder.update({ where: { id: item.order.id }, data: { status: "approved", reviewVersion: { increment: 1 }, activeCartKey: null } });
    }));
    assert.deepEqual(await row(item.order.id), before); assert.equal((await grants(item.order.id)).length, 0);
    for (const actorId of [item.userId, "legacy-editor", "legacy-moderator"]) await assert.rejects(prisma.paymentReviewEvent.create({ data: {
      orderId: item.order.id, actorId, actorSessionVersion: (await prisma.user.findUnique({ where: { id: actorId } })).sessionVersion,
      action: "receipt", version: before.reviewVersion + 1, fromStatus: before.status, toStatus: "pending_review", idempotencyKey: randomUUID(), requestHash: "test", internalNote: "forged" } }));
    const old = await prisma.accessEntitlement.findFirstOrThrow({ where: { orderItemId: null } });
    const target = await prisma.paymentOrderItem.findFirstOrThrow({ where: { orderId: item.order.id } });
    await assert.rejects(prisma.accessEntitlement.update({ where: { id: old.id }, data: { orderItemId: target.id } }));
  });
  await check("financial authority and session version are checked inside the transaction, not only at HTTP", async () => {
    const item = await create(); const input = await reviewInput(item.order.id, "receipt", { amount: "100", reference: `bank/${randomUUID()}` });
    for (const id of [null, item.userId, "legacy-editor", "legacy-moderator"]) {
      const service = forUser(id)("src/lib/server/payment-reviews.ts");
      await assert.rejects(service.reviewOrder(item.order.id, input), /unauthorized|forbidden/);
      await assert.rejects(service.getAdminOrder(item.order.id), /unauthorized|forbidden/);
    }
    const stale = await prisma.user.findUniqueOrThrow({ where: { id: "legacy-admin" } });
    await prisma.user.update({ where: { id: stale.id }, data: { sessionVersion: { increment: 1 } } });
    await assert.rejects(forUser(stale.id, prisma, {}, stale)("src/lib/server/payment-reviews.ts").reviewOrder(item.order.id, input), /forbidden/);
    assert.equal(await prisma.paymentLedgerEntry.count({ where: { orderId: item.order.id } }), 0);
  });
  await check("HTTP enforces CSRF, strict bodies, fail-closed distributed rate limits, flags and private responses", async () => {
    await prisma.authRateLimit.deleteMany(); const item = await create();
    const route = adminLoad("src/app/api/v1/admin/payment-orders/[id]/route.ts");
    const origin = process.env.NEXTAUTH_URL;
    const request = (body, headers = {}) => new Request(`${origin}/api/v1/admin/payment-orders/${item.order.id}`, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    const context = { params: Promise.resolve({ id: item.order.id }) };
    const input = await reviewInput(item.order.id, "receipt", { amount: "100", reference: `bank/${randomUUID()}` });
    assert.equal((await route.POST(request(input, { origin: "https://evil.test" }), context)).status, 403);
    assert.equal((await route.POST(request(input, { "content-type": "text/plain" }), context)).status, 415);
    assert.equal((await route.POST(request({ ...input, userId: item.userId }), context)).status, 400);
    assert.equal((await route.POST(request({ ...input, internalNote: "a".repeat(10000) }), context)).status, 413);
    const ok = await route.POST(request(input), context); assert.equal(ok.status, 200); assert.match(ok.headers.get("cache-control"), /private.*no-store/);
    for (let i = 0; i < 57; i++) await route.POST(request(input), context);
    assert.equal((await route.POST(request(input), context)).status, 429);
    await prisma.authRateLimit.deleteMany();
    process.env.PAYMENT_V1_ENABLED = "false";
    process.env.PAYMENT_REVIEW_ENABLED = "false";
    assert.equal((await route.POST(request(input), context)).status, 503);
    assert.equal((await route.GET(new Request(`${origin}/api/v1/admin/payment-orders/${item.order.id}`), context)).status, 200);
    await assert.rejects(item.student.submitOrderReview(item.order.id, { expectedVersion: 1, idempotencyKey: randomUUID() }), /payment_review_unavailable/);
    process.env.PAYMENT_V1_ENABLED = "true";
    process.env.PAYMENT_REVIEW_ENABLED = "true";
    const broken = new Proxy(prisma, { get(target, key) { if (key === "$queryRaw") return () => { throw new Error("rate_backend_down"); }; return Reflect.get(target, key); } });
    const failing = forUser("legacy-admin", broken)("src/app/api/v1/admin/payment-orders/[id]/route.ts");
    assert.equal((await failing.POST(request(input), context)).status, 503);
  });
  await check("repeatable review history paginates without leaking internal notes into student DTOs", async () => {
    const item = await create(); await receipt(item.order.id, "1");
    for (let i = 0; i < 34; i++) await act(item.order.id, "note", { studentMessage: `public-${i}`, internalNote: `PRIVATE-${i}` });
    const firstPage = await reviews.getAdminOrder(item.order.id); assert.equal(firstPage.activity.length, 30); assert.ok(firstPage.nextBefore);
    const nextPage = await reviews.getAdminOrder(item.order.id, { before: firstPage.nextBefore }); assert.equal(nextPage.activity.length, 5);
    assert.equal(new Set([...firstPage.activity, ...nextPage.activity].map((e) => e.id)).size, 35);
    const student = await item.service.getOrder(item.order.id); assert.equal(student.messages.length, 20); assert.doesNotMatch(JSON.stringify(student), /PRIVATE/);
    const list = await reviews.listAdminOrders({ q: item.order.reference }); assert.equal(list.items.length, 1); assert.equal(list.items[0].id, item.order.id);
  });
  await check("overlap prevention follows subjects across carts without blocking unrelated subjects", async () => {
    const multi = await create({ planIds: plans });
    await assert.rejects(create({ userId: multi.userId, planIds: [plans[1]] }), /active_order_exists/);
    const first = await create(); const second = await create({ userId: first.userId, planIds: [plans[1]] });
    await receipt(first.order.id, "100"); await act(first.order.id, "approved");
    await receipt(second.order.id, "50"); await act(second.order.id, "approved");
    assert.equal((await grants(first.order.id)).length, 1); assert.equal((await grants(second.order.id)).length, 1);
  });
  await check("the same transfer racing across different orders credits only one and leaves no partial audit on the other", async () => {
    const first = await create(); const second = await create(); const reference = `bank/${randomUUID()}`;
    const results = await Promise.allSettled([receipt(first.order.id, "100", reference), receipt(second.order.id, "100", reference.toUpperCase())]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.find((r) => r.status === "rejected").reason.code, "transfer_reference_used");
    const amounts = [(await first.service.getOrder(first.order.id)).verifiedAmount, (await second.service.getOrder(second.order.id)).verifiedAmount].sort();
    assert.deepEqual(amounts, ["0.00", "100.00"]);
    assert.equal(await prisma.paymentReviewEvent.count({ where: { orderId: { in: [first.order.id, second.order.id] } } }), 1);
  });
  await check("history reads never mix an expired pre-payment state with a newly documented balance", async () => {
    const item = await create({ hoursAgo: 26 }); let release; let reached;
    const gate = new Promise((r) => release = r); const ready = new Promise((r) => reached = r);
    const paused = new Proxy(prisma, { get(target, key) {
      if (key === "$transaction") return (work, options) => prisma.$transaction((tx) => work(new Proxy(tx, { get(t, k) {
        if (k === "paymentLedgerEntry") return new Proxy(t.paymentLedgerEntry, { get(model, name) {
          if (name === "aggregate") return async (args) => { reached(); await gate; return model.aggregate(args); };
          return Reflect.get(model, name);
        } });
        return Reflect.get(t, k);
      } })), options);
      return Reflect.get(target, key);
    } });
    const reading = forUser(item.userId, paused)("src/lib/server/payment-orders.ts").getOrder(item.order.id);
    await ready;
    try { await receipt(item.order.id, "100"); } finally { release(); }
    const consistent = await reading;
    assert.equal(consistent.status, "expired"); assert.equal(consistent.verifiedAmount, "0.00");
    const current = await item.service.getOrder(item.order.id);
    assert.equal(current.status, "pending_review"); assert.equal(current.verifiedAmount, "100.00");
  });
  assert.deepEqual(await prisma.subscriptionCode.findMany({ orderBy: { id: "asc" } }), codesBefore);
  await prisma.authRateLimit.deleteMany();
  console.log(`${count} P5 PostgreSQL/service acceptance groups passed`);
} catch (error) {
  console.error("P5 acceptance failed", error);
  throw error;
} finally {
  const deadline = setTimeout(() => { console.error("P5 test client disconnect timed out"); process.exit(1); }, 15000);
  try { await prisma.$disconnect(); } finally { clearTimeout(deadline); }
}

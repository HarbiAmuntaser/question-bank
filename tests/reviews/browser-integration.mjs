import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { createWriteStream, writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { f, password } from "../payments/fixtures.mjs";
const tools = createRequire(resolve(process.env.P2_TEST_TOOLS ?? ".tmp/p2-tools/package.json"));
const { chromium } = tools("playwright");
const origin = process.env.NEXTAUTH_URL; const work = process.env.P2_TEST_WORK;
const db = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(db.hostname, "127.0.0.1"); assert.equal(db.pathname, "/p2_test"); assert.equal(new URL(origin).hostname, "localhost");
const prisma = new PrismaClient({ datasourceUrl: db.href });
const checks = [], errors = []; let server, browser, log, serverRun = 0;
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS P5 browser ${checks.length}: ${name}`); }
async function start(enabled, reviewEnabled = enabled) {
  log = createWriteStream(join(work, `next-reviews-${enabled}-${reviewEnabled}-${++serverRun}.log`));
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbo", "--hostname", "127.0.0.1", "--port", new URL(origin).port], {
    env: { ...process.env, PAYMENT_V1_ENABLED: String(enabled), PAYMENT_REVIEW_ENABLED: String(reviewEnabled), PAYMENT_CODES_ENABLED: "false", STUDENT_REGISTRATION_ENABLED: "false" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(log); server.stderr.pipe(log);
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(`Next exited: ${work}`);
    try { if ((await fetch(`${origin}/auth/signin`, { signal: AbortSignal.timeout(5000) })).ok) return; } catch {}
    await delay(1000);
  }
  throw new Error("Next did not become ready");
}
async function stop() {
  if (server && server.exitCode === null) {
    // End document streams before deliberately stopping the dev server to change flags.
    if (browser?.isConnected()) for (const context of browser.contexts()) for (const page of context.pages()) await page.goto("about:blank");
    const exited = new Promise((r) => server.once("exit", r));
    if (process.platform === "win32") {
      try { execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); }
      catch (error) { try { process.kill(server.pid, 0); throw error; } catch (check) { if (check === error || check.code !== "ESRCH") throw check; } }
    }
    else server.kill("SIGTERM");
    await exited;
  }
  log?.end(); server = undefined;
}
async function newPage(context) {
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => { errors.push(e.message); console.error("P5/R1 browser error", { url: page.url(), message: e.message, stack: e.stack }); });
  return page;
}
async function waitForHydration(page, selector) {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    return element && Object.keys(element).some((key) => key.startsWith("__reactProps$"));
  }, selector);
}
async function gotoWithNetworkRetry(page, url, options) {
  try {
    return await page.goto(url, options);
  } catch (error) {
    if (!String(error).includes("ERR_NETWORK_IO_SUSPENDED")) throw error;
    await delay(500);
    return page.goto(url, options);
  }
}
async function signin(page, email, admin = false, callback = "/account/orders") {
  await gotoWithNetworkRetry(page, `/auth/${admin ? "admin/" : ""}signin?callbackUrl=${encodeURIComponent(callback)}`, { waitUntil: "domcontentloaded" });
  await waitForHydration(page, 'button[type="submit"]');
  await page.locator('[name="email"]').fill(email); await page.locator('[name="password"]').fill(admin ? "A memorable student phrase" : password);
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL(`${origin}${callback}`, { waitUntil: "commit" });
  } catch (error) {
    if (!String(error).includes("ERR_NETWORK_IO_SUSPENDED")) throw error;
    await page.goto(`${origin}${callback}`);
    await page.waitForURL(`${origin}${callback}`, { waitUntil: "commit" });
  }
}
async function screenshot(page, name, viewport) {
  await page.setViewportSize(viewport); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  assert.equal(await page.evaluate(() => scrollY), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no page overflow`);
  const clipped = await page.locator('main button, main label, [role="alertdialog"] button').evaluateAll((items) => items.filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map((el) => el.textContent));
  assert.deepEqual(clipped, [], `${name}: controls fit`);
  assert.deepEqual(await page.locator("img").evaluateAll((items) => items.filter((el) => el.complete && el.naturalWidth === 0).map((el) => el.src)), [], `${name}: visual assets load`);
  await page.screenshot({ path: join(work, `${name}.png`), fullPage: true });
}
const post = (context, path, data) => context.request.post(path, { headers: { origin }, data });
async function submitReview(page) {
  await page.getByRole("button", { name: "إرسال للمراجعة", exact: true }).click();
  await page.getByRole("button", { name: "تأكيد الإرسال", exact: true }).click();
  await page.getByText("بانتظار المراجعة", { exact: true }).waitFor();
}
async function adminAction(page, orderId, action, fields = {}) {
  await page.locator("#review-action").selectOption(action);
  if (fields.amount !== undefined) await page.locator("#review-amount").fill(fields.amount);
  if (fields.reference !== undefined) await page.locator("#review-reference").fill(fields.reference);
  await page.locator("#review-internal-note").fill(fields.internalNote ?? "PRIVATE browser verification");
  await page.locator("#review-student-message").fill(fields.studentMessage ?? "");
  await page.getByRole("button", { name: "مراجعة العملية وتأكيدها", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor({ state: "visible" });
  const [result] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith(`/api/v1/admin/payment-orders/${orderId}`) && r.request().method() === "POST"),
    dialog.getByRole("button", { name: "تأكيد العملية", exact: true }).click(),
  ]);
  assert.equal(result.status(), 200, await result.text());
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  const body = await result.json();
  if (body.data.conflictCode) await page.locator('main [role="alert"]').waitFor();
  else await page.getByText("تم حفظ العملية.", { exact: true }).waitFor();
  // Wait for the refreshed optimistic version, not just the mutation response.
  await page.waitForFunction((version) => Array.from(document.querySelectorAll("dt")).some((el) => el.textContent === "نسخة المراجعة" && el.nextElementSibling?.textContent === String(version)), body.data.version);
  return body.data;
}
try {
  await prisma.authRateLimit.deleteMany();
  const template = await prisma.user.findUniqueOrThrow({ where: { id: f.alice } });
  const studentId = randomUUID(); const email = `${studentId}@p5-browser.example.test`;
  await prisma.user.create({ data: { id: studentId, email, normalizedEmail: email, name: "طالب مراجعة الدفع", password: template.password, role: "student", emailVerified: new Date() } });
  const contact = { whatsappNumber: "966500000000", telegramUsername: "paymenttest" };
  await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { ...contact, price: "100", defaultDurationDays: 30, isActive: true } });
  const plan2 = await prisma.paidAccessPlan.create({ data: { title: "P5 browser second plan", scopeType: "subject", subjectId: f.sa2, price: "50", defaultDurationDays: 60, ...contact } });
  process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([f.plan, plan2.id]);
  await start(false);
  browser = await chromium.launch({ executablePath: process.env.P2_TEST_BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const admin = await browser.newContext({ baseURL: origin }); const adminPage = await newPage(admin);
  const student = await browser.newContext({ baseURL: origin }); const page = await newPage(student);
  await check("closed release allows Admin-only review history, denies payment writes and keeps registration closed", async () => {
    await signin(adminPage, "legacy.admin@example.test", true, "/admin/payment-orders");
    await adminPage.getByRole("heading", { name: "طلبات الدفع", exact: true }).waitFor();
    const document = await admin.request.get("/admin/payment-orders?q=student%40example.test");
    assert.equal(document.headers()["referrer-policy"], "no-referrer"); assert.match(document.headers()["x-robots-tag"], /noindex/);
    assert.equal((await post(admin, `/api/v1/admin/payment-orders/${randomUUID()}`, {})).status(), 503);
    await signin(page, email);
    assert.equal((await student.request.get("/api/v1/admin/payment-orders")).status(), 403);
    assert.equal((await post(student, "/api/v1/auth/register", {})).status(), 503);
  });
  await stop(); await start(true);
  let id, reference, followupOrderId, followup;
  await check("student saves a two-subject order and explicitly submits it for review without verifying money", async () => {
    await page.goto(`/account/orders/new?planId=${f.plan}&planId=${plan2.id}`);
    await page.getByText("150.00 SAR", { exact: true }).waitFor();
    const response = page.waitForResponse((r) => r.url().endsWith("/api/v1/student/orders") && r.status() === 201);
    await page.getByRole("button", { name: "تأكيد وإنشاء الطلب", exact: true }).click();
    const order = (await (await response).json()).data.order; id = order.id; reference = order.reference;
    await page.waitForURL(`${origin}/account/orders/${id}`, { waitUntil: "commit" });
    await submitReview(page);
    assert.equal(await prisma.paymentLedgerEntry.count({ where: { orderId: id } }), 0);
    assert.equal(await prisma.accessEntitlement.count({ where: { orderItem: { orderId: id } } }), 0);
    assert.equal((await student.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 403);
    await screenshot(page, "p5-student-review-mobile", { width: 360, height: 800 });
  });
  await check("admin search and partial receipt show a remaining balance with no access and no internal-note leak", async () => {
    await adminPage.goto("/admin/payment-orders"); await adminPage.locator("#order-search").fill(reference);
    await adminPage.getByRole("button", { name: "بحث", exact: true }).click();
    await adminPage.getByText(reference, { exact: true }).click(); await adminPage.waitForURL(`${origin}/admin/payment-orders/${id}`, { waitUntil: "commit" });
    await waitForHydration(adminPage, "#review-action");
    await adminAction(adminPage, id, "receipt", { amount: "40", reference: `bank/${randomUUID()}` });
    await adminAction(adminPage, id, "additional_requested", { studentMessage: "يرجى استكمال 110 ريال" });
    await page.reload(); await page.getByText("بانتظار استكمال المبلغ", { exact: true }).waitFor();
    assert.ok((await page.locator("main").innerText()).includes("يرجى استكمال 110 ريال"));
    assert.ok(!(await page.locator("body").innerText()).includes("PRIVATE"));
    assert.ok(!(await (await student.request.get(`/api/v1/student/orders/${id}`)).text()).includes("PRIVATE"));
    assert.equal(await prisma.accessEntitlement.count({ where: { orderItem: { orderId: id } } }), 0);
    await screenshot(adminPage, "p5-admin-partial-desktop", { width: 1440, height: 1000 });
    await screenshot(adminPage, "p5-admin-partial-mobile", { width: 390, height: 844 });
    await submitReview(page);
  });
  await check("overpayment blocks approval, preserves the money, and requires a documented manual settlement", async () => {
    await adminPage.reload();
    await adminAction(adminPage, id, "receipt", { amount: "120", reference: `bank/${randomUUID()}` });
    const blocked = await adminAction(adminPage, id, "approved"); assert.equal(blocked.conflictCode, "overpayment_requires_settlement");
    assert.equal(await prisma.accessEntitlement.count({ where: { orderItem: { orderId: id } } }), 0);
    await screenshot(adminPage, "p5-admin-overpayment-mobile", { width: 360, height: 800 });
    await adminAction(adminPage, id, "refund", { amount: "10", reference: `refund/${randomUUID()}`, studentMessage: "تم رد 10 ريالات زائدة" });
    assert.equal((await prisma.paymentOrder.findUnique({ where: { id } })).status, "pending_review");
    assert.equal(await prisma.accessEntitlement.count({ where: { orderItem: { orderId: id } } }), 0);
  });
  await check("explicit approval creates both account entitlements, updates student status and exposes no private notes", async () => {
    await adminAction(adminPage, id, "approved", { studentMessage: "تم اعتماد اشتراك المادتين" });
    await adminPage.getByRole("heading", { name: "الاستحقاقات", exact: true }).waitFor();
    assert.equal(await prisma.accessEntitlement.count({ where: { userId: studentId, orderItem: { orderId: id } } }), 2);
    await page.reload(); await page.getByText("معتمد", { exact: true }).waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("PRIVATE"));
    const view = await student.request.get(`/api/v1/student/orders/${id}`); assert.match(view.headers()["cache-control"], /private.*no-store/);
    assert.equal((await view.json()).data.verifiedAmount, "150.00");
    assert.equal((await student.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 200);
    const sameAccount = await browser.newContext({ baseURL: origin }); const sameAccountPage = await newPage(sameAccount);
    await signin(sameAccountPage, email);
    assert.equal((await sameAccount.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 200);
    await sameAccount.close();
    await screenshot(page, "p5-student-approved-mobile", { width: 390, height: 844 });
    await screenshot(adminPage, "p5-admin-approved-desktop", { width: 1440, height: 1000 });
    await screenshot(adminPage, "p5-admin-approved-mobile", { width: 360, height: 800 });
    const quote = (await (await post(student, "/api/v1/student/orders/quote", { planIds: [f.plan] })).json()).data;
    const renewal = await post(student, "/api/v1/student/orders", { planIds: [f.plan], quoteVersion: quote.version, contactMethod: "whatsapp", idempotencyKey: randomUUID() });
    assert.equal(renewal.status(), 409); assert.equal((await renewal.json()).error, "active_entitlement_exists");
  });
  await check("correction controls append void and replacement instead of changing the original receipt", async () => {
    const otherId = randomUUID(); const otherEmail = `${otherId}@p5-browser.example.test`;
    await prisma.user.create({ data: { id: otherId, email: otherEmail, normalizedEmail: otherEmail, password: template.password, role: "student", emailVerified: new Date() } });
    const context = await browser.newContext({ baseURL: origin }); const otherPage = await newPage(context); await signin(otherPage, otherEmail);
    const quote = (await (await post(context, "/api/v1/student/orders/quote", { planIds: [f.plan] })).json()).data;
    const created = await post(context, "/api/v1/student/orders", { planIds: [f.plan], quoteVersion: quote.version, contactMethod: "whatsapp", idempotencyKey: randomUUID() }); assert.equal(created.status(), 201);
    const otherOrder = (await created.json()).data.order;
    followupOrderId = otherOrder.id; followup = context;
    await adminPage.goto(`/admin/payment-orders/${otherOrder.id}`);
    const transfer = `bank/${randomUUID()}`;
    await adminAction(adminPage, otherOrder.id, "receipt", { amount: "70", reference: transfer });
    const before = await prisma.paymentLedgerEntry.findUniqueOrThrow({ where: { reference: transfer } });
    await adminPage.getByRole("button", { name: `تصحيح ${transfer}`, exact: true }).click();
    await adminAction(adminPage, otherOrder.id, "correction", { amount: "40", internalNote: "PRIVATE corrected a recording error" });
    assert.deepEqual(await prisma.paymentLedgerEntry.findUnique({ where: { id: before.id } }), before);
    assert.equal(await prisma.paymentLedgerEntry.count({ where: { orderId: otherOrder.id } }), 3);
    await screenshot(adminPage, "p5-admin-correction-mobile", { width: 360, height: 800 });
    assert.equal((await context.request.get(`/api/v1/admin/payment-orders/${otherOrder.id}`)).status(), 403);
    assert.equal((await post(student, `/api/v1/student/orders/${otherOrder.id}/review`, { expectedVersion: 2, idempotencyKey: randomUUID() })).status(), 404);
  });
  await check("R1: sales pause and an empty launch list retain paid access and allow existing-order review without codes", async () => {
    await stop(); process.env.PAYMENT_LAUNCH_PLAN_IDS = "[]"; await start(false, true);
    assert.equal((await student.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 200);
    assert.equal((await followup.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 403);
    assert.equal((await post(student, "/api/v1/student/orders", {})).status(), 503);
    assert.equal((await post(followup, "/api/v1/student/access/redeem", { code: "ignored", subjectId: f.sa })).status(), 503);
    assert.equal((await post(followup, `/api/v1/student/orders/${followupOrderId}/contact`, {})).status(), 200);
    await adminPage.goto(`/admin/payment-orders/${followupOrderId}`);
    await adminAction(adminPage, followupOrderId, "receipt", { amount: "60", reference: `r1/${randomUUID()}` });
    await adminAction(adminPage, followupOrderId, "approved");
    assert.equal((await followup.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 200);
    await adminPage.goto("/admin/subscriptions");
    assert.equal(await adminPage.getByRole("button", { name: "كود جديد", exact: true }).isDisabled(), true);
    await screenshot(adminPage, "r1-review-only-desktop", { width: 1440, height: 1000 });
    await screenshot(adminPage, "r1-review-only-mobile", { width: 390, height: 844 });
    await page.goto("/account/orders/new"); await page.getByText("إنشاء الطلبات غير متاح حاليًا.", { exact: true }).waitFor();
    await screenshot(page, "r1-sales-paused-mobile", { width: 360, height: 800 });
  });
  await check("R1: sales use the server launch list while paused financial review and codes remain closed", async () => {
    await stop(); process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([f.plan]); await start(true, false);
    const catalog = await student.request.get("/api/v1/student/orders/catalog"); assert.equal(catalog.status(), 200);
    assert.deepEqual((await catalog.json()).data.map((plan) => plan.planId), [f.plan]);
    const excluded = await post(student, "/api/v1/student/orders/quote", { planIds: [plan2.id] });
    assert.equal(excluded.status(), 409); assert.equal((await excluded.json()).error, "plan_not_in_launch");
    assert.equal((await post(admin, `/api/v1/admin/payment-orders/${followupOrderId}`, {})).status(), 503);
    assert.equal((await post(followup, `/api/v1/student/orders/${followupOrderId}/review`, {})).status(), 503);
    assert.equal((await student.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 200);
    await adminPage.goto("/admin/subscriptions");
    assert.equal(await adminPage.getByRole("button", { name: "كود جديد", exact: true }).isDisabled(), true);
    await screenshot(adminPage, "r1-sales-only-mobile", { width: 390, height: 844 });
    await followup.close();
  });
  let revokeRequest;
  await check("R2: plan and code shutdown controls require a reason, and plan shutdown requires explicit content confirmation", async () => {
    const plan = await prisma.paidAccessPlan.create({ data: { title: "R2 browser shutdown plan", subjectId: f.sa2, scopeType: "subject", isActive: true } });
    const code = await prisma.subscriptionCode.create({ data: { planId: f.plan, codeHash: randomUUID(), codePreview: "R2-test-stop", createdBy: "legacy-admin" } });
    await adminPage.goto("/admin/subscriptions");
    await adminPage.getByRole("row").filter({ hasText: plan.title }).getByRole("button", { name: "تعطيل الخطة", exact: true }).click();
    const dialog = adminPage.getByRole("alertdialog");
    await dialog.getByLabel("سبب التعطيل (داخلي)", { exact: true }).fill("R2 reviewed content change");
    assert.equal(await dialog.getByRole("button", { name: "تأكيد التعطيل", exact: true }).isDisabled(), true);
    await dialog.getByRole("checkbox").check();
    await screenshot(adminPage, "r2-plan-confirm-mobile", { width: 360, height: 800 });
    await dialog.getByRole("button", { name: "تأكيد التعطيل", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    assert.equal((await prisma.paidAccessPlan.findUniqueOrThrow({ where: { id: plan.id } })).isActive, false);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { planId: plan.id, action: "plan_disabled" } }), 1);
    await adminPage.goto("/admin/subscriptions?tab=codes");
    await adminPage.getByRole("row").filter({ hasText: "R2-test-stop" }).getByRole("button", { name: "تعطيل الكود", exact: true }).click();
    await dialog.getByLabel("سبب التعطيل (داخلي)", { exact: true }).fill("R2 code stop while issuance closed");
    await dialog.getByRole("button", { name: "تأكيد التعطيل", exact: true }).click(); await dialog.waitFor({ state: "hidden" });
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: code.id } })).isActive, false);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { codeId: code.id, action: "code_disabled" } }), 1);
  });
  await check("R2: confirmed audited revocation blocks paid access without changing approved money or revealing the internal reason", async () => {
    const target = await prisma.accessEntitlement.findFirstOrThrow({ where: { userId: studentId, subjectId: f.sa, orderItem: { orderId: id } } });
    const subject = await prisma.subject.findUniqueOrThrow({ where: { id: f.sa } });
    const originalOrder = await prisma.paymentOrder.findUniqueOrThrow({ where: { id } });
    const ledger = await prisma.paymentLedgerEntry.findMany({ where: { orderId: id } });
    await adminPage.goto("/admin/subscriptions?tab=entitlements");
    const row = adminPage.getByRole("row").filter({ has: adminPage.getByRole("cell", { name: email, exact: true }) }).filter({ has: adminPage.getByRole("cell", { name: subject.name, exact: true }) });
    await row.getByRole("button", { name: "تعطيل الاشتراك", exact: true }).click();
    const dialog = adminPage.getByRole("alertdialog");
    assert.equal(await dialog.getByRole("button", { name: "تأكيد التعطيل", exact: true }).isDisabled(), true);
    await dialog.getByLabel("سبب التعطيل (داخلي)", { exact: true }).fill("PRIVATE R2 browser review <script>window.__r2AuditXss=1</script>");
    await screenshot(adminPage, "r2-revoke-confirm-mobile", { width: 360, height: 800 });
    const request = adminPage.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"]));
    await dialog.getByRole("button", { name: "تأكيد التعطيل", exact: true }).click(); revokeRequest = await request;
    await dialog.waitFor({ state: "hidden" });
    assert.equal((await prisma.accessEntitlement.findUniqueOrThrow({ where: { id: target.id } })).isActive, false);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { entitlementId: target.id } }), 1);
    assert.deepEqual(await prisma.paymentOrder.findUniqueOrThrow({ where: { id } }), originalOrder);
    assert.deepEqual(await prisma.paymentLedgerEntry.findMany({ where: { orderId: id } }), ledger);
    assert.equal((await student.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 403);
    assert.equal((await (await student.request.get(`/api/v1/student/orders/${id}`)).text()).includes("PRIVATE R2"), false);
    await adminPage.goto("/admin/subscriptions/audit");
    const auditResponse = await admin.request.get("/admin/subscriptions/audit");
    assert.match(auditResponse.headers()["cache-control"], /no-store/);
    assert.doesNotMatch(auditResponse.headers()["cache-control"], /public|s-maxage/);
    assert.equal(auditResponse.headers()["referrer-policy"], "no-referrer");
    assert.match(auditResponse.headers()["x-robots-tag"], /noindex/);
    await adminPage.getByRole("heading", { name: "سجل تدقيق الاشتراكات", exact: true }).waitFor();
    assert.equal(await adminPage.evaluate(() => window.__r2AuditXss), undefined);
    assert.ok((await adminPage.locator("main").innerText()).includes("PRIVATE R2 browser review"));
    await screenshot(adminPage, "r2-audit-desktop", { width: 1440, height: 1000 });
    await screenshot(adminPage, "r2-audit-mobile", { width: 390, height: 844 });
  });
  await check("R2: audit pages and captured Admin Server Actions reject students and cross-origin submissions", async () => {
    await page.goto("/admin/subscriptions/audit"); await page.waitForURL(/\/auth\/forbidden/, { waitUntil: "commit" });
    const before = await prisma.paymentAdminEvent.count();
    const headers = { "next-action": revokeRequest.headers()["next-action"], "content-type": revokeRequest.headers()["content-type"], origin };
    const denied = await student.request.post(revokeRequest.url(), { headers, data: revokeRequest.postDataBuffer(), maxRedirects: 0 });
    assert.equal(denied.status(), 307); assert.equal(new URL(denied.headers().location).pathname, "/auth/forbidden");
    const cross = await admin.request.post(revokeRequest.url(), { headers: { ...headers, origin: "https://evil.example" }, data: revokeRequest.postDataBuffer() });
    assert.ok([403, 500].includes(cross.status()));
    assert.equal(await prisma.paymentAdminEvent.count(), before);
  });
  await check("revoking an admin session immediately blocks review APIs and pages", async () => {
    await prisma.user.update({ where: { id: "legacy-admin" }, data: { sessionVersion: { increment: 1 } } });
    assert.equal((await admin.request.get("/api/v1/admin/payment-orders")).status(), 401);
    const denied = await admin.request.post(revokeRequest.url(), { headers: { "next-action": revokeRequest.headers()["next-action"], "content-type": revokeRequest.headers()["content-type"], origin }, data: revokeRequest.postDataBuffer() });
    assert.ok([401, 403, 500].includes(denied.status()));
    await adminPage.goto("/admin/payment-orders"); await adminPage.waitForURL(/\/auth\/admin\/signin/, { waitUntil: "commit" });
  });
  assert.deepEqual(errors, [], "no browser runtime errors");
  writeFileSync(join(work, "p5-browser-results.json"), JSON.stringify({ checks, runtimeErrors: errors }, null, 2));
  console.log(`${checks.length} P5 browser acceptance groups passed`);
} finally { await browser?.close(); await stop(); await prisma.$disconnect(); }

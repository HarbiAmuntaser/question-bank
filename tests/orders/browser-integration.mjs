import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { createWriteStream, writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { f as sharedFixtures, password } from "../payments/fixtures.mjs";
const f = { ...sharedFixtures, alice: randomUUID() };
const studentEmail = `${f.alice}@p4-browser.example.test`;
const toolRequire = createRequire(resolve(process.env.P2_TEST_TOOLS ?? ".tmp/p2-tools/package.json"));
const { chromium } = toolRequire("playwright");
const origin = process.env.NEXTAUTH_URL; const work = process.env.P2_TEST_WORK;
const db = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(db.hostname, "127.0.0.1"); assert.equal(db.pathname, "/p2_test"); assert.equal(new URL(origin).hostname, "localhost");
const prisma = new PrismaClient({ datasourceUrl: db.href });
const checks = [], errors = []; let server, browser, log;
async function check(name, test) { await test(); checks.push(name); console.log(`PASS P4 browser ${checks.length}: ${name}`); }
async function start(enabled) {
  log = createWriteStream(join(work, `next-orders-${enabled}.log`));
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbo", "--hostname", "127.0.0.1", "--port", new URL(origin).port], {
    env: { ...process.env, PAYMENT_V1_ENABLED: String(enabled), PAYMENT_REVIEW_ENABLED: String(enabled), PAYMENT_CODES_ENABLED: "false", STUDENT_REGISTRATION_ENABLED: "false" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
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
async function pageFor(context) { const page = await context.newPage(); page.setDefaultTimeout(60000); page.on("pageerror", (e) => errors.push(e.message)); return page; }
async function signin(page, email, callback = "/account/orders", admin = false) {
  await page.goto(`/auth/${admin ? "admin/" : ""}signin?callbackUrl=${encodeURIComponent(callback)}`);
  await page.locator('[name="email"]').fill(email); await page.locator('[name="password"]').fill(admin ? "A memorable student phrase" : password);
  const response = page.waitForResponse((r) => r.url().includes(`/api/auth/callback/${admin ? "admin" : "student"}-credentials`) && r.request().method() === "POST");
  await page.locator('button[type="submit"]').click(); assert.equal((await response).status(), 200);
  await page.waitForURL(`${origin}${callback}`);
}
async function screenshot(page, name, viewport) {
  await page.setViewportSize(viewport); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  assert.equal(await page.evaluate(() => scrollY), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no page overflow`);
  const clipped = await page.locator('main button, main label, [role="alertdialog"] button').evaluateAll((items) =>
    items.filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map((el) => el.textContent));
  assert.deepEqual(clipped, [], `${name}: controls fit`);
  const broken = await page.locator("img").evaluateAll((items) => items.filter((el) => el.complete && el.naturalWidth === 0).map((el) => el.src));
  assert.deepEqual(broken, [], `${name}: visual assets load`);
  await page.screenshot({ path: join(work, `${name}.png`), fullPage: true });
}
const post = (context, suffix, data) => context.request.post(`/api/v1/student/orders${suffix}`, { headers: { origin }, data });
try {
  await prisma.authRateLimit.deleteMany();
  const template = await prisma.user.findUniqueOrThrow({ where: { id: sharedFixtures.alice } });
  await prisma.user.create({ data: { id: f.alice, email: studentEmail, normalizedEmail: studentEmail, name: "P4 browser student", password: template.password, role: "student", emailVerified: new Date() } });
  await prisma.user.update({ where: { id: f.unverified }, data: { emailVerified: new Date() } });
  const contact = { whatsappNumber: "966500000000", telegramUsername: "paymenttest" };
  await prisma.paidAccessPlan.update({ where: { id: f.plan }, data: { ...contact, price: "25.00", defaultDurationDays: 30, title: "P4 primary plan", isActive: true } });
  const plan2 = await prisma.paidAccessPlan.create({ data: { title: "P4 second plan", scopeType: "subject", subjectId: f.sa2, price: "40.00", defaultDurationDays: 60, ...contact } });
  process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([f.plan, plan2.id]);
  const financialBefore = { grants: await prisma.accessEntitlement.count(), codes: await prisma.subscriptionCode.count() };
  await start(false);
  browser = await chromium.launch({ executablePath: process.env.P2_TEST_BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const student = await browser.newContext({ baseURL: origin, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await pageFor(student);
  await check("closed launch has no create form; verified student history remains private and readable", async () => {
    await signin(page, studentEmail, `/account/orders/new?planId=${f.plan}`);
    await page.getByText("إنشاء الطلبات غير متاح حاليًا.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "تأكيد وإنشاء الطلب" }).count(), 0);
    assert.equal((await post(student, "", {})).status(), 503);
    const response = await student.request.get("/api/v1/student/orders"); assert.equal(response.status(), 200);
    assert.match(response.headers()["cache-control"], /private.*no-store/);
    const document = await student.request.get("/account/orders");
    assert.match(document.headers()["x-robots-tag"], /noindex/);
    assert.equal(document.headers()["referrer-policy"], "no-referrer");
    assert.match(document.headers()["cache-control"], /no-store/);
    await screenshot(page, "p4-closed-mobile", { width: 390, height: 844 });
  });
  await stop(); await start(true);
  await check("paid-content dialog links to saved-order flow, never directly to social contact", async () => {
    // Use a student without a P3 grant to exercise the existing subscription gate.
    const bob = await browser.newContext({ baseURL: origin }); const bobPage = await pageFor(bob);
    const quizPath = `/SA/university/universities/u-${f.sa}/majors/m-${f.sa}/subjects/${f.sa}/quizzes/${f.paid}`;
    await signin(bobPage, "unverified@p3.example.test", quizPath);
    await bobPage.getByRole("button", { name: "عرض خيارات الاشتراك", exact: true }).click();
    assert.equal(await bobPage.getByRole("link", { name: "طلب اشتراك", exact: true }).getAttribute("href"), `/account/orders/new?planId=${f.plan}`);
    assert.equal(await bobPage.locator('[role="dialog"] a[href^="https://wa.me"], [role="dialog"] a[href^="https://t.me"]').count(), 0);
    await bob.close();
  });
  let orderId, reference;
  await check("multi-subject quote, failed-save retry and confirmation create one order before any handoff", async () => {
    await page.goto(`/account/orders/new?planId=${f.plan}&planId=${plan2.id}`);
    await page.getByText("65.00 SAR", { exact: true }).waitFor();
    await page.getByRole("checkbox", { checked: true }).first().waitFor();
    assert.equal(await page.getByRole("checkbox", { checked: true }).count(), 2);
    assert.equal(await page.locator('main a[href^="https://wa.me"], main a[href^="https://t.me"]').count(), 0);
    await screenshot(page, "p4-checkout-desktop", { width: 1440, height: 1000 });
    await screenshot(page, "p4-checkout-mobile", { width: 360, height: 800 });
    const submissions = []; let failFirst = true;
    await page.route("**/api/v1/student/orders", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      submissions.push(route.request().postDataJSON());
      if (failFirst) { failFirst = false; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "payment_temporarily_unavailable" }) }); }
      return route.continue();
    });
    const countBefore = await prisma.paymentOrder.count();
    await page.getByRole("button", { name: "تأكيد وإنشاء الطلب", exact: true }).click();
    await page.locator('main [role="alert"]').waitFor(); assert.equal(await prisma.paymentOrder.count(), countBefore);
    assert.equal(await page.locator('main a[target="_blank"]').count(), 0);
    const response = page.waitForResponse((r) => r.url().endsWith("/api/v1/student/orders") && r.status() === 201);
    await page.getByRole("button", { name: "تأكيد وإنشاء الطلب", exact: true }).click();
    const saved = (await (await response).json()).data.order; orderId = saved.id; reference = saved.reference;
    await page.waitForURL(`${origin}/account/orders/${orderId}`);
    await page.getByRole("heading", { name: "تفاصيل الطلب", exact: true }).waitFor();
    assert.equal(submissions.length, 2); assert.equal(submissions[0].idempotencyKey, submissions[1].idempotencyKey);
    assert.equal(await prisma.paymentOrder.count(), countBefore + 1);
    assert.equal(await page.locator('main a[target="_blank"]').count(), 0);
    await page.unroute("**/api/v1/student/orders");
    await screenshot(page, "p4-order-mobile", { width: 390, height: 844 });
  });
  await check("contact prepares an audited reference message after save, without treating it as a payment", async () => {
    await page.getByRole("button", { name: "متابعة عبر واتساب", exact: true }).click();
    await page.getByRole("link", { name: "فتح واتساب", exact: true }).waitFor();
    const message = await page.locator("#order-contact-message").inputValue(); assert.ok(message.includes(reference)); assert.ok(message.includes("65.00 SAR"));
    assert.ok(!message.includes("alice")); assert.ok(!message.includes(f.alice));
    const href = await page.getByRole("link", { name: "فتح واتساب", exact: true }).getAttribute("href");
    assert.equal(new URL(href).hostname, "wa.me"); assert.equal(new URL(href).searchParams.get("text"), message);
    await page.getByRole("button", { name: "نسخ الرسالة", exact: true }).click();
    // Windows clipboard converts LF to CRLF; message contents must still match exactly.
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"), message);
    assert.equal((await prisma.paymentOrder.findUnique({ where: { id: orderId } })).status, "pending_payment");
    assert.equal(await prisma.paymentOrderEvent.count({ where: { orderId, type: "contact_requested" } }), 1);
    await screenshot(page, "p4-contact-desktop", { width: 1440, height: 1000 });
    await screenshot(page, "p4-contact-mobile", { width: 360, height: 800 });
  });
  await check("order pages, APIs and admin boundaries reject unrelated identities and injected fields", async () => {
    const other = await browser.newContext({ baseURL: origin }); const otherPage = await pageFor(other);
    await signin(otherPage, "bob@p3.example.test");
    for (const suffix of ["", "/contact", "/cancel"]) {
      const result = suffix ? await post(other, `/${orderId}${suffix}`, {}) : await other.request.get(`/api/v1/student/orders/${orderId}`);
      assert.equal(result.status(), 404);
    }
    await otherPage.goto(`/account/orders/${orderId}`); assert.ok(!(await otherPage.locator("body").innerText()).includes(reference));
    assert.equal((await other.request.get("/api/v1/admin/users")).status(), 403);
    const quote = (await (await post(student, "/quote", { planIds: [f.plan] })).json()).data;
    assert.equal((await post(student, "", { planIds: [f.plan], quoteVersion: quote.version, idempotencyKey: randomUUID(), contactMethod: "whatsapp", status: "approved" })).status(), 400);
    const admin = await browser.newContext({ baseURL: origin }); const adminPage = await pageFor(admin);
    await signin(adminPage, "legacy.admin@example.test", "/admin", true);
    assert.equal((await admin.request.get("/api/v1/student/orders")).status(), 401);
    await admin.close(); await other.close();
  });
  await check("duplicate cart links to original order; cancellation updates history and prevents contact", async () => {
    await page.goto(`/account/orders/new?planId=${f.plan}&planId=${plan2.id}`);
    await page.getByText("65.00 SAR", { exact: true }).waitFor();
    await page.getByRole("button", { name: "تأكيد وإنشاء الطلب", exact: true }).click();
    const existing = page.getByRole("link", { name: "عرض الطلب الموجود", exact: true }); await existing.waitFor();
    assert.equal(await existing.getAttribute("href"), `/account/orders/${orderId}`); await existing.click();
    await page.getByRole("button", { name: "إلغاء الطلب", exact: true }).click();
    await screenshot(page, "p4-cancel-mobile", { width: 390, height: 844 });
    await page.getByRole("button", { name: "تأكيد الإلغاء", exact: true }).click();
    await page.getByText("ملغي", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "متابعة عبر واتساب", exact: true }).count(), 0);
    await page.getByRole("link", { name: "جميع الطلبات", exact: true }).click();
    await page.waitForURL(`${origin}/account/orders`);
    await page.getByRole("heading", { name: "طلبات الاشتراك", exact: true }).waitFor();
    await page.getByText(reference, { exact: true }).waitFor();
    await screenshot(page, "p4-history-mobile", { width: 360, height: 800 });
    await screenshot(page, "p4-history-desktop", { width: 1440, height: 1000 });
  });
  await check("session revocation protects order history immediately; order flow grants no access", async () => {
    await prisma.user.update({ where: { id: f.alice }, data: { sessionVersion: { increment: 1 } } });
    assert.equal((await student.request.get(`/api/v1/student/orders/${orderId}`)).status(), 401);
    await page.goto(`/account/orders/${orderId}`); await page.waitForURL(/\/auth\/signin\?/);
    assert.equal(new URL(page.url()).searchParams.get("callbackUrl"), `/account/orders/${orderId}`);
    assert.deepEqual({ grants: await prisma.accessEntitlement.count(), codes: await prisma.subscriptionCode.count() }, financialBefore);
  });
  assert.deepEqual(errors, [], "no browser runtime errors");
  writeFileSync(join(work, "p4-browser-results.json"), JSON.stringify({ checks, runtimeErrors: errors }, null, 2));
  console.log(`${checks.length} P4 browser acceptance groups passed`);
} finally { await browser?.close(); await stop(); await prisma.$disconnect(); }

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { createWriteStream, writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f, password } from "./fixtures.mjs";

const toolRequire = createRequire(resolve(process.env.P2_TEST_TOOLS ?? ".tmp/p2-tools/package.json"));
const { chromium } = toolRequire("playwright");
const origin = process.env.NEXTAUTH_URL;
const work = process.env.P2_TEST_WORK;
const database = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1"); assert.equal(database.pathname, "/p2_test");
assert.equal(new URL(origin).hostname, "localhost");
const prisma = new PrismaClient({ datasourceUrl: database.href });
const load = moduleLoader({ "@/lib/prisma": { prisma }, "@/lib/auth-helpers": { getCurrentUser: () => prisma.user.findUnique({ where: { id: "legacy-admin" } }) } });
const checks = [], errors = [];
let server, browser, log;
async function check(name, test) { await test(); checks.push(name); console.log(`PASS P3 browser ${checks.length}: ${name}`); }
async function start(enabled) {
  process.env.PAYMENT_V1_ENABLED = String(enabled);
  process.env.PAYMENT_CODES_ENABLED = String(enabled);
  process.env.PAYMENT_LAUNCH_PLAN_IDS = JSON.stringify([f.plan]);
  process.env.PAYMENT_CODE_PLAN_IDS = JSON.stringify([f.plan]);
  log = createWriteStream(join(work, `next-payments-${enabled}.log`));
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbo", "--hostname", "127.0.0.1", "--port", new URL(origin).port], {
    env: { ...process.env, STUDENT_REGISTRATION_ENABLED: "false" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(log); server.stderr.pipe(log);
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited: see ${work}`);
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
async function newPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}
async function signin(page, portal, email, pass, callback) {
  await page.goto(`${origin}/auth/${portal === "admin" ? "admin/" : ""}signin${callback ? `?callbackUrl=${encodeURIComponent(callback)}` : ""}`);
  await page.locator('[name="email"]').fill(email); await page.locator('[name="password"]').fill(pass);
  const response = page.waitForResponse((r) => r.url().includes(`/api/auth/callback/${portal}-credentials`) && r.request().method() === "POST");
  await page.locator('button[type="submit"]').click(); assert.equal((await response).status(), 200);
  await page.waitForURL(`${origin}${callback ?? (portal === "admin" ? "/admin" : "/account")}`);
}
function detail(subjectId, quizId, cc = "SA", type = "university") {
  return `/${cc}/${type}/universities/u-${subjectId}/majors/m-${subjectId}/subjects/${subjectId}/quizzes/${quizId}`;
}
async function screenshot(page, name, viewport) {
  await page.setViewportSize(viewport); await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: no page overflow`);
  const clipped = await page.locator('main button, [role="dialog"] button, [role="dialog"] label').evaluateAll((items) =>
    items.filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map((el) => el.textContent));
  assert.deepEqual(clipped, [], `${name}: controls fit`);
  await page.screenshot({ path: join(work, `${name}.png`), fullPage: true });
}
try {
  await start(false);
  browser = await chromium.launch({ executablePath: process.env.P2_TEST_BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const guest = await browser.newContext({ baseURL: origin });
  const guestPage = await newPage(guest);
  await check("closed launch rejects payment operations; paid content stays locked", async () => {
    assert.equal((await guest.request.post("/api/v1/student/access/redeem", { headers: { origin }, data: {} })).status(), 503);
    assert.equal((await guest.request.post("/api/v1/student/access/payment-request", { headers: { origin }, data: {} })).status(), 410);
    const locked = await guest.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`);
    assert.equal(locked.status(), 403); assert.equal((await locked.text()).includes("PROTECTED"), false);
    await guestPage.goto(detail(f.sa, f.paid));
    await guestPage.getByRole("button", { name: "تسجيل دخول الطالب", exact: true }).waitFor();
    assert.equal(await guestPage.getByRole("link", { name: "طلب اشتراك", exact: true }).count(), 0);
    await screenshot(guestPage, "p3-payment-closed-mobile", { width: 390, height: 844 });
  });
  await check("YE and academy pages never fetch subscription status and still hide unpublished content", async () => {
    const statusRequests = [];
    const track = (request) => { if (request.url().includes("/api/v1/student/access/")) statusRequests.push(request.url()); };
    guestPage.on("request", track);
    for (const [subjectId, quizId, cc, type] of [[f.ye, f.yeQuiz, "YE", "university"], [f.academy, f.academyQuiz, "SA", "academy"]]) {
      await guestPage.goto(detail(subjectId, quizId, cc, type));
      await guestPage.locator(`a[href="/quiz/${quizId}"]`).waitFor();
      assert.equal((await guest.request.get(`/api/v1/student/quizzes/by-id/${quizId}`)).status(), 200);
      await screenshot(guestPage, `p3-outside-${cc}-${type}`, { width: 390, height: 844 });
    }
    assert.deepEqual(statusRequests, []); guestPage.off("request", track);
    assert.equal((await guest.request.get(`/api/v1/student/quizzes/by-id/${f.hiddenQuiz}`)).status(), 404);
    assert.equal((await guest.request.get(`/api/v1/student/summaries/${f.draft}/pdf`)).status(), 404);
  });
  const admin = await browser.newContext({ baseURL: origin });
  const adminPage = await newPage(admin);
  await check("administration excludes retired anonymous ownership and permits only inactive SA subject drafts while closed", async () => {
    await signin(adminPage, "admin", "legacy.admin@example.test", "A memorable student phrase");
    await adminPage.goto("/admin/subscriptions");
    assert.equal(await adminPage.getByRole("button", { name: "كود جديد", exact: true }).isDisabled(), true);
    await screenshot(adminPage, "p3-admin-desktop", { width: 1440, height: 1000 });
    await screenshot(adminPage, "p3-admin-mobile", { width: 390, height: 844 });
    await adminPage.getByRole("button", { name: "خطة جديدة", exact: true }).click();
    await adminPage.getByRole("button", { name: "ابحث عن مادة جامعية سعودية", exact: true }).click();
    const option = adminPage.getByRole("option").filter({ has: adminPage.getByText("SA university", { exact: true }) }).first();
    await option.waitFor();
    const options = await adminPage.getByRole("option").allTextContents();
    assert.equal(options.some((text) => /YE university|SA academy|Hidden/.test(text)), false);
    await option.click();
    await adminPage.locator('[name="title"]').fill("P3 browser draft");
    await adminPage.locator('[name="reason"]').fill("P3 browser draft creation");
    assert.equal(await adminPage.getByRole("switch").isDisabled(), true);
    await screenshot(adminPage, "p3-plan-mobile", { width: 390, height: 844 });
    await adminPage.getByRole("button", { name: "حفظ", exact: true }).click();
    await adminPage.getByRole("dialog").waitFor({ state: "hidden" });
    const plan = await prisma.paidAccessPlan.findFirst({ where: { title: "P3 browser draft" } });
    assert.equal(plan.subjectId, f.sa); assert.equal(plan.scopeType, "subject"); assert.equal(plan.isActive, false);
    await adminPage.goto("/admin/subscriptions?tab=entitlements");
    assert.equal(await adminPage.getByText("قديم غير منسوب", { exact: true }).count(), 0);
    assert.equal((await adminPage.content()).includes("p3-anonymous-token"), false);
  });
  await admin.close(); await stop(); await start(true);
  await check("anonymous paid visitor is sent to student sign-in with a safe return path", async () => {
    await guestPage.goto(detail(f.sa, f.paid));
    await guestPage.getByRole("button", { name: "تسجيل دخول الطالب", exact: true }).click();
    await guestPage.getByRole("dialog").waitFor();
    assert.equal(await guestPage.locator("#subscriptionCode").count(), 0);
    const link = guestPage.getByRole("link", { name: "تسجيل الدخول", exact: true });
    const href = await link.getAttribute("href");
    assert.equal(new URL(href, origin).searchParams.get("callbackUrl"), detail(f.sa, f.paid));
    await screenshot(guestPage, "p3-student-login-gate-mobile", { width: 390, height: 844 });
  });
  const student = await browser.newContext({ baseURL: origin });
  const studentPage = await newPage(student);
  await check("student redeems through the dialog and opens the authenticated server-rendered quiz", async () => {
    await signin(studentPage, "student", "alice@p3.example.test", password, detail(f.sa, f.paid));
    const code = (await load("src/lib/server/payment-admin.ts").issuePaymentCode({
      planId: f.plan, idempotencyKey: randomUUID(), maxUses: 1, durationDays: 30, startsAt: null, expiresAt: null, note: "P3 browser test",
    }, "P3 browser test issuance")).plainCode;
    await studentPage.getByRole("button", { name: "عرض خيارات الاشتراك", exact: true }).click();
    await studentPage.locator("#subscriptionCode").fill(code);
    await screenshot(studentPage, "p3-redeem-desktop", { width: 1440, height: 1000 });
    await screenshot(studentPage, "p3-redeem-mobile", { width: 390, height: 844 });
    const response = studentPage.waitForResponse((r) => r.url().endsWith("/api/v1/student/access/redeem") && r.request().method() === "POST");
    await studentPage.getByRole("button", { name: "تفعيل الكود", exact: true }).click();
    const result = await response; assert.equal(result.status(), 200);
    const grant = (await result.json()).data.entitlement;
    assert.equal(grant.userId, f.alice);
    await studentPage.getByRole("dialog").waitFor({ state: "hidden" });
    await studentPage.locator(`a[href="/quiz/${f.paid}"]`).waitFor();
    const document = await studentPage.goto(`/quiz/${f.paid}`);
    assert.equal(document.status(), 200); assert.match(await document.text(), /PROTECTED SA university/);
    const privateResponse = await student.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`);
    assert.match(privateResponse.headers()["cache-control"], /no-store/);
  });
  await check("a new browser login keeps account access; another account and revoked sessions cannot reuse it", async () => {
    assert.equal((await guest.request.get(`/api/v1/student/quizzes/preview/by-id/${f.hiddenQuiz}`)).status(), 404);
    assert.equal((await guest.request.get(`/api/v1/student/quizzes/by-subject/${f.hidden}`)).status(), 404);
    const otherBrowser = await browser.newContext({ baseURL: origin });
    const otherPage = await newPage(otherBrowser);
    await signin(otherPage, "student", "alice@p3.example.test", password);
    assert.equal((await otherBrowser.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 200);
    await prisma.user.update({ where: { id: f.unverified }, data: { emailVerified: new Date() } });
    const unrelated = await browser.newContext({ baseURL: origin });
    const unrelatedPage = await newPage(unrelated);
    await signin(unrelatedPage, "student", "unverified@p3.example.test", password);
    assert.equal((await unrelated.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 403);
    assert.equal((await unrelated.request.get("/api/v1/admin/users")).status(), 403);
    assert.equal((await unrelated.request.post("/api/v1/student/quizzes/grade", { data: { quizId: f.paid, answers: {} } })).status(), 403);
    assert.equal((await unrelated.request.get(`/api/v1/student/summaries/${f.saSummary}/pdf`)).status(), 403);
    const paidPage = await unrelatedPage.goto(`/quiz/${f.paid}`);
    assert.equal((await paidPage.text()).includes("PROTECTED SA university"), false);
    await prisma.user.update({ where: { id: f.alice }, data: { sessionVersion: { increment: 1 } } });
    assert.equal((await otherBrowser.request.get(`/api/v1/student/quizzes/by-id/${f.paid}`)).status(), 403);
    await otherBrowser.close(); await unrelated.close();
  });
  assert.deepEqual(errors, [], "no browser runtime errors");
  writeFileSync(join(work, "p3-browser-results.json"), JSON.stringify({ checks, runtimeErrors: errors }, null, 2));
  console.log(`${checks.length} P3 browser acceptance groups passed`);
} finally { await browser?.close(); await stop(); await prisma.$disconnect(); }

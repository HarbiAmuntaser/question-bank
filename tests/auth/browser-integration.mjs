import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";

const toolRequire = createRequire(resolve(process.env.P2_TEST_TOOLS ?? ".tmp/p2-tools/package.json"));
const { chromium } = toolRequire("playwright");
const origin = process.env.NEXTAUTH_URL;
const work = process.env.P2_TEST_WORK;
const database = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1"); assert.equal(database.pathname, "/p2_test");
assert.equal(new URL(origin).hostname, "localhost");
const prisma = new PrismaClient({ datasourceUrl: database.href });
const email = "browser@example.test";
const password = "A memorable student phrase";
const newPassword = "A new memorable student phrase";
const checks = [];
let server, browser, log;
async function check(name, test) { await test(); checks.push(name); console.log(`PASS browser ${checks.length}: ${name}`); }
async function start(enabled) {
  log = createWriteStream(join(work, `next-${enabled}.log`));
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbo", "--hostname", "127.0.0.1", "--port", new URL(origin).port], {
    env: { ...process.env, STUDENT_REGISTRATION_ENABLED: String(enabled) }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
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
    if (browser?.isConnected()) {
      for (const context of browser.contexts()) {
        for (const page of context.pages()) await page.goto("about:blank");
      }
    }
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
function mailLink(path) {
  const messages = JSON.parse(readFileSync(process.env.P2_TEST_MAILBOX, "utf8"));
  const message = messages.filter((m) => m.to.includes(email) && m.text.includes(path)).at(-1);
  assert.ok(message, "mail received inside local TLS SMTP sink");
  return message.text.match(/https?:\/\/[^\s]+/)[0];
}
async function submit(page, path, values) {
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === path && r.request().method() === "POST");
  for (const [name, value] of Object.entries(values)) await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('button[type="submit"]').click();
  return response;
}
async function signin(page, portal, account, pass = password) {
  await page.goto(`${origin}/auth/${portal === "admin" ? "admin/" : ""}signin`);
  return submit(page, `/api/auth/callback/${portal}-credentials`, { email: account, password: pass });
}
async function newPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  return page;
}
async function screenshot(page, name, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: no horizontal overflow`);
  const clipped = await page.locator("main button, main label, main h1, main a").evaluateAll((items) => items.filter((el) => el.scrollWidth > el.clientWidth + 2).map((el) => el.tagName));
  assert.deepEqual(clipped, [], `${name}: text fits controls`);
  assert.ok(await page.locator('header img').evaluate((img) => img.complete && img.naturalWidth > 0), "brand image loaded");
  await page.screenshot({ path: join(work, `${name}.png`), fullPage: true });
}
try {
  await start(false);
  browser = await chromium.launch({ executablePath: process.env.P2_TEST_BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const context = await browser.newContext({ baseURL: origin });
  const page = await newPage(context);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await check("closed registration rejects writes and hides form/link", async () => {
    await page.goto("/auth/register");
    assert.equal(await page.locator('input[name="email"]').count(), 0);
    const response = await context.request.post("/api/v1/auth/register", { headers: { origin }, data: { name: "Closed", email: "closed@example.test", password, confirmPassword: password } });
    assert.equal(response.status(), 503);
    assert.equal(await prisma.user.count({ where: { normalizedEmail: "closed@example.test" } }), 0);
    await screenshot(page, "registration-closed-mobile", { width: 390, height: 844 });
    await page.goto("/auth/signin"); assert.equal(await page.locator('a[href^="/auth/register"]').count(), 0);
  });
  await stop(); await start(true);
  let verificationLink;
  await check("registration form, password confirmation, TLS delivery, safe callback", async () => {
    await page.goto("/auth/register?callbackUrl=https%3A%2F%2Fevil.example");
    await screenshot(page, "registration-desktop", { width: 1440, height: 1000 });
    await screenshot(page, "registration-mobile", { width: 360, height: 800 });
    const response = await submit(page, "/api/v1/auth/register", { name: "Browser Student", email, password, confirmPassword: password });
    assert.equal(response.status(), 202);
    await page.getByRole("status").waitFor();
    verificationLink = mailLink("verify-email");
    assert.equal((await prisma.user.findUnique({ where: { normalizedEmail: email } })).role, "student");
    assert.equal((await signin(page, "student", email)).status(), 401);
    await page.locator('main [role="alert"]').waitFor();
  });
  await check("GET is read-only; verification requires password; auth pages do not leak tokens", async () => {
    const response = await page.goto(verificationLink);
    assert.equal(response.headers()["referrer-policy"], "no-referrer");
    assert.match(response.headers()["x-robots-tag"], /noindex/);
    assert.match(response.headers()["cache-control"], /no-store/);
    assert.equal((await prisma.user.findUnique({ where: { normalizedEmail: email } })).emailVerified, null);
    assert.equal(await page.locator('script[src*="insights"]').count(), 0);
    await screenshot(page, "verification-mobile", { width: 390, height: 844 });
    assert.equal((await submit(page, "/api/v1/auth/verify-email", { password })).status(), 200);
    await page.getByRole("status").waitFor();
    const response2 = await context.request.post("/api/v1/auth/verify-email", { headers: { origin }, data: { token: new URL(verificationLink).searchParams.get("token"), password } });
    assert.equal(response2.status(), 400);
  });
  let savedState;
  await check("student sign-in and persistent session reach a minimal account page", async () => {
    assert.equal((await signin(page, "student", email)).status(), 200);
    await page.waitForURL(`${origin}/account`);
    await page.getByText(email, { exact: true }).waitFor();
    await screenshot(page, "account-desktop", { width: 1440, height: 1000 });
    await screenshot(page, "account-mobile", { width: 360, height: 800 });
    const cookie = (await context.cookies()).find((c) => c.name === "next-auth.session-token");
    assert.ok(cookie.httpOnly); assert.equal(cookie.sameSite, "Lax"); assert.ok(cookie.expires > Date.now() / 1000 + 29 * 86400);
    savedState = await context.storageState();
    const reopened = await browser.newContext({ baseURL: origin, storageState: savedState });
    const reopenedPage = await newPage(reopened); await reopenedPage.goto("/account");
    await reopenedPage.getByText(email, { exact: true }).waitFor(); await reopened.close();
  });
  await check("student cannot enter admin pages or read or mutate admin APIs", async () => {
    await page.goto("/admin"); await page.waitForURL(`${origin}/auth/forbidden`);
    for (const path of ["/api/v1/admin/users", "/api/v1/admin/subjects"]) {
      assert.equal((await context.request.get(path)).status(), 403);
      assert.equal((await context.request.post(path, { data: {} })).status(), 403);
    }
    const anonymous = await browser.newContext({ baseURL: origin });
    const adminPage = await newPage(anonymous);
    assert.equal((await signin(adminPage, "admin", email)).status(), 401);
    await anonymous.close();
  });
  await check("password reset end to end revokes an existing browser session", async () => {
    await page.goto("/auth/forgot-password");
    assert.equal((await submit(page, "/api/v1/auth/forgot-password", { email })).status(), 202);
    await page.getByRole("status").waitFor();
    await page.goto(mailLink("reset-password"));
    await screenshot(page, "reset-mobile", { width: 390, height: 844 });
    assert.equal((await submit(page, "/api/v1/auth/reset-password", { password: newPassword, confirmPassword: newPassword })).status(), 200);
    const oldContext = await browser.newContext({ baseURL: origin, storageState: savedState });
    const oldPage = await newPage(oldContext); await oldPage.goto("/account");
    await oldPage.waitForURL(/\/auth\/signin/); await oldContext.close();
    assert.equal((await signin(page, "student", email, password)).status(), 401);
    assert.equal((await signin(page, "student", email, newPassword)).status(), 200);
    await page.waitForURL(`${origin}/account`);
  });
  await check("admin sign-in still works; student provider refuses administrative accounts", async () => {
    const adminContext = await browser.newContext({ baseURL: origin });
    const adminPage = await newPage(adminContext);
    assert.equal((await signin(adminPage, "student", "legacy.admin@example.test")).status(), 401);
    await adminPage.goto(`${origin}/auth/admin/signin`);
    await screenshot(adminPage, "admin-signin-desktop", { width: 1440, height: 1000 });
    assert.equal((await signin(adminPage, "admin", "legacy.admin@example.test")).status(), 200);
    try {
      await adminPage.waitForURL(`${origin}/admin`, { waitUntil: "commit" });
    } catch (error) {
      if (!String(error).includes("ERR_NETWORK_IO_SUSPENDED")) throw error;
      await adminPage.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
      await adminPage.waitForURL(`${origin}/admin`, { waitUntil: "commit" });
    }
    assert.equal((await adminContext.request.get("/api/v1/admin/users")).status(), 200);
    await adminContext.close();
  });
  assert.deepEqual(errors, [], "no browser runtime errors");
  writeFileSync(join(work, "browser-results.json"), JSON.stringify({ checks, runtimeErrors: errors }, null, 2));
  console.log(`${checks.length} browser acceptance groups passed`);
} finally {
  await browser?.close(); await stop(); await prisma.$disconnect();
}

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { moduleLoader } from "../admin/load-module.mjs";

assert.ok(process.env.CODE_UX_PLAYWRIGHT, "Set CODE_UX_PLAYWRIGHT to an existing external Playwright package.json");
const browserRequire = createRequire(resolve(process.env.CODE_UX_PLAYWRIGHT));
const { chromium, firefox, webkit } = browserRequire("playwright");
const work = resolve(".tmp", "code-only-browser");
mkdirSync(work, { recursive: true });
const bundle = await build({
  stdin: { contents: `
    import React, { useState } from "react";
    import { createRoot } from "react-dom/client";
    import { SubscriptionGateDialog } from "./src/components/public/subscription-gate-dialog";
    const params = new URLSearchParams(location.search);
    const plan = { id: "plan", scopeType: "subject", title: "خطة المادة",
      description: "الاختبارات والملخصات وملفات الفصل", price: "1.00", currency: "SAR",
      durationDays: 7, universityName: "جامعة نجران", collegeName: "كلية الحاسب",
      majorName: "تقنية المعلومات", subjectName: "تطوير تطبيقات الإنترنت والويب",
      subjectId: "subject", majorId: null, whatsappNumber: "+966500000000", telegramUsername: null };
    const access = { allowed: false, canPurchase: params.get("manual") === "true",
      canRedeemCode: true, reason: params.get("account") ? "paid_access_required" : "student_signin_required",
      subjectId: "subject", plan, codePlan: { ...plan, title: "خطة الأكواد" } };
    function App() {
      const [open, setOpen] = useState(true);
      return <SubscriptionGateDialog open={open} onOpenChange={setOpen} access={access}
        targetTitle={plan.subjectName} onRedeemed={() => { window.refreshCount = (window.refreshCount || 0) + 1; }} />;
    }
    window.refreshEvents = 0;
    window.addEventListener("mustawak:access-updated", () => window.refreshEvents++);
    createRoot(document.getElementById("root")).render(<App />);
  `, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, platform: "browser", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{
    name: "fixture-link",
    setup(builder) {
      builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }',
        loader: "js", resolveDir: process.cwd(),
      }));
    },
  }],
});
const css = await postcss([tailwindcss({
  content: ["src/components/public/subscription-gate-dialog.tsx", "src/components/ui/*.{ts,tsx}"],
  theme: { extend: {
    colors: { primary: "#149589", foreground: "#17211f", background: "#ffffff", muted: "#eff4f3",
      border: "#dde5e3", input: "#d0d9d6", destructive: "#b91c1c", secondary: "#eff4f3", ring: "#149589" },
    borderRadius: { lg: "8px" },
  } },
})]).process("@tailwind base; @tailwind components; @tailwind utilities;", { from: undefined });
const cookie = moduleLoader({ "@/lib/prisma": { prisma: {} }, "next/headers": {} }, {
  process: { env: { NODE_ENV: "development" } },
})("src/lib/server/code-access-cookie.ts");
const server = createServer((request, response) => {
  if (request.url === "/bundle.js") {
    response.setHeader("Content-Type", "application/javascript");
    response.end(bundle.outputFiles[0].text);
  } else if (request.url === "/style.css") {
    response.setHeader("Content-Type", "text/css"); response.end(css.css);
  } else if (request.url === "/cookie") {
    response.setHeader("Set-Cookie", cookie.guestAccessCookieHeader("A".repeat(43), new Date(Date.now() + 30 * 86_400_000)));
    response.end("ok");
  } else {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end('<!doctype html><html lang="ar" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{font-family:Arial,sans-serif}button,a{overflow-wrap:anywhere}</style><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = "http://127.0.0.1:" + server.address().port;
const results = [];
let launched = 0;
try {
  for (const [name, engine, options] of [
    ["edge", chromium, { channel: "msedge" }],
    ["chromium", chromium, {}], ["firefox", firefox, {}], ["webkit", webkit, {}],
  ]) {
    if (name !== "edge" && !existsSync(engine.executablePath())) {
      results.push({ browser: name, status: "NOT_AVAILABLE" }); continue;
    }
    let browser;
    try {
      browser = await engine.launch({ headless: true, ...options });
      launched++;
      for (const [view, viewport, mobile] of [
        ["desktop", { width: 1366, height: 900 }, false],
        ["mobile", { width: 390, height: 844 }, name !== "firefox"],
      ]) {
        const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, locale: "ar-SA" });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(origin);
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        assert.equal(await dialog.getByRole("link", { name: /تسجيل الدخول لطلب|طلب اشتراك/ }).count(), 0);
        assert.equal(await dialog.locator('a[href*="/account/orders/new"]').count(), 0);
        const whatsapp = dialog.getByRole("link", { name: "طلب كود تفعيل عبر WhatsApp" });
        await page.screenshot({ path: join(work, name + "-" + view + "-collapsed.png") });
        const message = new URL(await whatsapp.getAttribute("href")).searchParams.get("text");
        for (const value of ["جامعة نجران", "كلية الحاسب", "تقنية المعلومات", "1.00 SAR", "7 يوم"]) assert.ok(message.includes(value));
        assert.ok(message.includes("خطة الأكواد"));
        assert.equal(await dialog.getByLabel("كود التفعيل", { exact: true }).isVisible(), false);
        const entry = dialog.getByRole("button", { name: "لدي كود تفعيل أو أريد استعادة الوصول" });
        await entry.click();
        assert.equal(await entry.getAttribute("aria-expanded"), "true");
        assert.ok(await dialog.getByText(/تسجيل الدخول لاحقًا لا ينقله إلى الحساب/).isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: join(work, name + "-" + view + ".png") });

        const attempts = [];
        let responseMode = "network";
        await page.route("**/api/v1/student/access/redeem", async (route) => {
          attempts.push(route.request().postDataJSON());
          if (responseMode === "network") return route.abort("failed");
          if (responseMode === "limit") return route.fulfill({ status: 409, json: { error: "browser_limit_reached",
            support: { supportReference: "AC-ABCDEFGHJKLM", whatsappNumber: "966500000000", maxBrowserSessions: 1 } } });
          return route.fulfill({ json: { data: { outcome: "transferred", grant: { principalType: "guest" } } } });
        });
        await dialog.getByLabel("كود التفعيل", { exact: true }).fill("QB-ABCD-EFGH-JKLM");
        const submit = dialog.getByRole("button", { name: "تفعيل أو استعادة", exact: true });
        await submit.click();
        await dialog.getByText(/تعذر الاتصال بخدمة التفعيل/).waitFor();
        responseMode = "limit";
        await submit.click();
        const transfer = dialog.getByRole("button", { name: "نقل الوصول إلى هذا المتصفح" });
        await transfer.waitFor();
        assert.equal(attempts[0].idempotencyKey, attempts[1].idempotencyKey);
        responseMode = "success";
        await transfer.click();
        await page.waitForFunction(() => window.refreshCount === 1 && window.refreshEvents === 1);
        assert.notEqual(attempts[1].idempotencyKey, attempts[2].idempotencyKey);
        assert.equal(attempts[2].operation, "transfer");
        assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));

        await page.goto(origin + "?manual=true&account=true");
        await page.getByRole("dialog").waitFor();
        assert.equal(await page.locator('a[href*="/account/orders/new"]').count(), 1);
        await context.request.get(origin + "/cookie");
        const saved = await context.storageState();
        const accessCookie = saved.cookies.find((item) => item.name === "mw_code_access");
        assert.ok(accessCookie.httpOnly && accessCookie.expires > Date.now() / 1000 + 29 * 86_400);
        await context.close();
        const reopened = await browser.newContext({ storageState: saved });
        assert.ok((await reopened.cookies(origin)).some((item) => item.name === "mw_code_access"));
        await reopened.clearCookies();
        assert.equal((await reopened.cookies(origin)).length, 0);
        await reopened.close();
        assert.deepEqual(errors, []);
        results.push({ browser: name, view, status: "PASS", scope: "real dialog with mocked activation responses; persisted-cookie storage-state restart simulation" });
      }
      if (name === "edge") {
        const profile = join(work, "edge-profile-" + Date.now());
        let persistent = await engine.launchPersistentContext(profile, { headless: true, ...options });
        try {
          await persistent.request.get(origin + "/cookie");
          assert.ok((await persistent.cookies(origin)).some((item) => item.name === "mw_code_access"));
        } finally { await persistent.close(); }
        persistent = await engine.launchPersistentContext(profile, { headless: true, ...options });
        try {
          assert.ok((await persistent.cookies(origin)).some((item) => item.name === "mw_code_access"));
        } finally { await persistent.close(); }
        const privateContext = await browser.newContext();
        try { assert.equal((await privateContext.cookies(origin)).length, 0); }
        finally { await privateContext.close(); }
        results.push({ browser: name, status: "PASS", scope: "actual persistent browser process restart; separate private context has no inherited cookie" });
      }
    } finally {
      await browser?.close();
    }
  }
  assert.ok(launched, "No browser available");
  console.log(JSON.stringify(results, null, 2));
} finally {
  await new Promise((done) => server.close(done));
}

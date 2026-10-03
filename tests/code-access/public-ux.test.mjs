import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const helpers = moduleLoader()("src/lib/code-access-public.ts");

test("public code access copy distinguishes activation, recovery and transfer", () => {
  assert.match(helpers.codeAccessSuccessMessage("activated", "guest"), /المتصفح/);
  assert.match(helpers.codeAccessSuccessMessage("activated", "account"), /بحسابك/);
  assert.match(helpers.codeAccessSuccessMessage("recovered"), /استعادة/);
  assert.match(helpers.codeAccessSuccessMessage("transferred"), /نقل/);
  assert.match(helpers.codeAccessErrorMessage("browser_limit_reached"), /الحد الأقصى/);
  assert.match(helpers.codeAccessErrorMessage("transfer_too_soon", 175), /3 دقائق/);
  assert.match(helpers.codeAccessErrorMessage("transfer_support_required"), /الدعم/);
});

test("WhatsApp support uses a safe reference and never requires the activation secret", () => {
  const href = helpers.whatsappCodeSupportUrl({
    whatsappNumber: "+966531297661",
    supportReference: "AC-ABCDEFGHJKLM",
    targetTitle: "Web Applications",
    planTitle: "Seven day plan",
    maxBrowserSessions: 2,
  });
  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/966531297661");
  const message = url.searchParams.get("text");
  assert.match(message, /Web Applications/);
  assert.match(message, /Seven day plan/);
  assert.match(message, /AC-ABCDEFGHJKLM/);
  assert.match(message, /2/);
  assert.match(message, /3/);
  assert.doesNotMatch(message, /QB-[A-Z0-9-]+/);

  assert.equal(helpers.whatsappCodeSupportUrl({
    whatsappNumber: "javascript:alert(1)",
    supportReference: "AC-ABCDEFGHJKLM",
    targetTitle: "Content",
    planTitle: "Plan",
    maxBrowserSessions: 1,
  }), null);
  assert.equal(helpers.whatsappCodeSupportUrl({
    whatsappNumber: "+966531297661",
    supportReference: "QB-SECRET-CODE",
    targetTitle: "Content",
    planTitle: "Plan",
    maxBrowserSessions: 1,
  }), null);
});

test("dialog keeps secrets ephemeral, retries idempotently and refreshes access after success", () => {
  const dialog = readFileSync("src/components/public/subscription-gate-dialog.tsx", "utf8");
  const access = readFileSync("src/components/public/subscription-access.tsx", "utf8");
  const summary = readFileSync("src/components/public/study-summaries/study-summary-subscribe-button.tsx", "utf8");

  assert.match(dialog, /crypto\.randomUUID\(\)/);
  assert.match(dialog, /idempotencyKey: idempotencyKey\(operation\)/);
  assert.match(dialog, /operation,/);
  assert.match(dialog, /submitCode\("transfer"\)/);
  assert.match(dialog, /onRedeemed\(\)/);
  assert.match(dialog, /aria-live="polite"/);
  assert.match(dialog, /<form/);
  assert.doesNotMatch(dialog, /localStorage|sessionStorage/);
  assert.doesNotMatch(dialog, /supportUrl[\s\S]{0,500}code/);
  assert.match(access, /onRedeemed=\{refreshAccess\}/);
  assert.match(summary, /onRedeemed \?\? \(\(\) => router\.refresh\(\)\)/);
});

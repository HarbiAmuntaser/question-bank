import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(path, "utf8");
}

test("Admin code management exposes references and audited operations without exposing secrets", () => {
  const page = source("src/app/admin/subscriptions/page.tsx");
  const dialog = source("src/components/admin/subscriptions/code-access-admin-dialog.tsx");
  const actions = source("src/app/admin/subscriptions/actions.ts");

  assert.match(page, /supportReference:[\s\S]*contains: codesQuery/);
  assert.match(page, /codePreview:[\s\S]*contains: codesQuery/);
  assert.doesNotMatch(page, /codeHash|tokenHash/);
  for (const operation of [
    "enableSubscriptionCodeAction",
    "disableSubscriptionCodeAction",
    "changeCodeBrowserLimitAction",
    "revokeCodeAccessSessionAction",
    "revokeCodeAccessGrantAction",
  ]) {
    assert.match(actions, new RegExp(`export async function ${operation}`));
    assert.match(dialog, new RegExp(operation));
  }
  assert.match(dialog, /requireConfirmation/);
  assert.match(dialog, /activeSessions/);
  assert.match(dialog, /supportReference/);
  assert.doesNotMatch(dialog, /codeHash|tokenHash/);
});

test("plan-level code management is the persisted runtime control", () => {
  const scope = source("src/lib/server/payment-scope.ts");
  const page = source("src/app/admin/subscriptions/page.tsx");
  const planDialog = source("src/components/admin/subscriptions/plan-dialog.tsx");
  const readiness = source("scripts/production-readiness.mjs");
  const example = source(".env.example");

  assert.match(scope, /paymentCodesEnabled\(\) && activationCodesEnabled/);
  assert.match(scope, /return \{ activationCodesEnabled: true \}/);
  assert.match(page, /activationCodesEnabled: true, isActive: true/);
  assert.match(planDialog, /activationCodesEnabled/);
  assert.doesNotMatch(scope, /PAYMENT_CODE_PLAN_IDS|paymentCodePlanIds/);
  assert.doesNotMatch(readiness, /PAYMENT_CODE_PLAN_IDS/);
  assert.doesNotMatch(example, /^PAYMENT_CODE_PLAN_IDS=/m);
});

test("code enable migration requires an immutable admin audit and preserves grant dates", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20261003090000_activation_code_enable_audit/migration.sql");
  const service = source("src/lib/server/payment-admin.ts");

  assert.match(schema, /enum PaymentAdminAction \{[\s\S]*code_enabled/);
  for (const marker of [
    "code_enabled",
    "payment_admin_transition_invalid",
    "payment_reactivation_not_supported",
  ]) assert.match(migration, new RegExp(marker));
  assert.ok(migration.includes('target_grant."expiresAt" <= clock_timestamp()'));
  assert.doesNotMatch(migration, /UPDATE\s+code_access_grants|INSERT\s+INTO\s+code_access_grants/i);
  assert.match(service, /action: "code_enabled"/);
  assert.match(service, /code_grant_not_reactivatable/);
  assert.match(service, /data: \{ isActive: true, updatedAt: nextUpdate\(old\) \}/);
});

test("session revocation targets one binding and never revokes the global guest session", () => {
  const service = source("src/lib/server/code-access.ts");
  const start = service.indexOf("export async function revokeCodeAccessSession");
  const end = service.indexOf("export async function revokeCodeAccessGrant", start);
  const body = service.slice(start, end);
  assert.match(body, /codeAccessSessionBinding\.update/);
  assert.match(body, /type: "session_revoked"/);
  assert.doesNotMatch(body, /guestAccessSession\.update/);
  assert.match(service, /browser_limit_below_active_sessions/);
});

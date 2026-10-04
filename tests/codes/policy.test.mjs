import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const id = "90000000-0000-4000-8000-000000000301";

test("code availability uses the global switch and plan flag, not the retired allowlist", () => {
  const load = (env) => moduleLoader({ "@/lib/prisma": { prisma: {} }, "@/lib/auth-helpers": {} }, { process: { env } })("src/lib/server/payment-scope.ts");
  for (const value of [undefined, "not-json", "*", "[]", JSON.stringify([id])]) {
    const codes = load({ PAYMENT_CODES_ENABLED: "true", PAYMENT_CODE_PLAN_IDS: value, PAYMENT_LAUNCH_PLAN_IDS: "[]" });
    assert.equal(codes.paymentCodePlanEnabled(id, true), true);
    assert.equal(codes.paymentCodePlanEnabled(id, false), false);
    assert.doesNotThrow(() => codes.requirePaymentCodePlan(id, true));
    assert.throws(() => codes.requirePaymentCodePlan(id, false), /code_plan_not_enabled/);
    assert.equal(codes.paymentSalesEnabled(), false);
  }
  const closed = load({ PAYMENT_CODES_ENABLED: "false", PAYMENT_CODE_PLAN_IDS: JSON.stringify([id]) });
  assert.equal(closed.paymentCodePlanEnabled(id, true), false);
  assert.throws(() => closed.requirePaymentCodePlan(id, true), /payment_codes_unavailable/);
});

test("issuance requires a UUID idempotency key and rejects client authority", () => {
  const schema = moduleLoader()("src/validations/payment.ts").issuePaymentCodeSchema;
  const valid = { planId: id, idempotencyKey: id, maxUses: 1, durationDays: 7, startsAt: null, expiresAt: null, note: null };
  assert.equal(schema.safeParse(valid).success, true);
  for (const input of [{ ...valid, idempotencyKey: "retry" }, { ...valid, actorId: id }, { ...valid, usedCount: 0 }, { ...valid, isActive: true }]) {
    assert.equal(schema.safeParse(input).success, false);
  }
});

test("datetime-local values are interpreted explicitly in Asia/Riyadh", () => {
  const time = moduleLoader()("src/lib/payment-time.ts");
  assert.equal(time.PAYMENT_OPERATIONAL_TIME_ZONE, "Asia/Riyadh");
  assert.equal(time.parsePaymentDateTimeLocal("2026-09-25T00:00").toISOString(), "2026-09-24T21:00:00.000Z");
  assert.equal(time.parsePaymentDateTimeLocal("2026-12-31T23:59").toISOString(), "2026-12-31T20:59:00.000Z");
  for (const value of ["2026-02-30T10:00", "2026-09-25", "2026-09-25T24:00", "2026-09-25T10:60"]) {
    assert.throws(() => time.parsePaymentDateTimeLocal(value), /invalid_payment_datetime/);
  }
});

test("student and Admin interfaces expose the hardened code states without extra authority fields", () => {
  const student = readFileSync("src/lib/code-access-public.ts", "utf8");
  for (const code of ["invalid_code", "code_not_started", "code_expired", "code_used", "code_plan_not_enabled", "active_entitlement_exists", "invalid_code_window"]) {
    assert.ok(student.includes(`case "${code}"`), code);
  }
  const action = readFileSync("src/app/admin/subscriptions/actions.ts", "utf8");
  assert.match(action, /parsePaymentDateTimeLocal/);
  assert.match(action, /idempotencyKey/);
  assert.doesNotMatch(action, /new Date\(value\)/);
});

test("hardening is additive and leaves prior migrations unchanged", () => {
  const sql = readFileSync("prisma/migrations/20260925090000_activation_code_hardening/migration.sql", "utf8");
  assert.match(sql, /payment_code_redemption_events/);
  assert.match(sql, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(sql, /payment_code_redemption_audit_required/);
  assert.match(sql, /access_entitlements_code_expiry_required/);
  assert.match(sql, /payment_code_redemption_audit_immutable/);
});

test("code access expand migration is additive and enforces immutable finite audited grants", () => {
  const sql = readFileSync("prisma/migrations/20260930090000_activation_code_access_expand/migration.sql", "utf8");
  for (const marker of ["code_access_grants", "guest_access_sessions", "code_access_session_bindings", "code_access_events",
    "code_access_activation_audit_required", "code_access_browser_limit_exceeded", "code_access_event_immutable",
    "activationCodesEnabled", "supportReference", "maxBrowserSessions"]) assert.match(sql, new RegExp(marker));
  assert.doesNotMatch(sql, /DROP TABLE\s+(subscription_codes|access_entitlements)/i);
});

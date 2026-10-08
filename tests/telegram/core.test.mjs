import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const config = moduleLoader()("src/lib/server/telegram/config.ts");

test("Telegram configuration is fail-closed and keeps the expiry bound configurable", () => {
  assert.deepEqual(config.getTelegramRuntimeConfig({}), {
    enabled: false,
    requestedEnabled: false,
    botToken: null,
    botUsername: null,
    webhookSecret: null,
    syncSecret: null,
    expiryMaxDelayMinutes: 15,
    reason: "disabled",
  });
  const valid = {
    TELEGRAM_ACCESS_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "12345:" + "a".repeat(40),
    TELEGRAM_BOT_USERNAME: "@MustawakAccessBot",
    TELEGRAM_WEBHOOK_SECRET: "s".repeat(32),
    TELEGRAM_SYNC_SECRET: "y".repeat(32),
    TELEGRAM_EXPIRY_MAX_DELAY_MINUTES: "10",
  };
  const enabled = config.getTelegramRuntimeConfig(valid);
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.botUsername, "MustawakAccessBot");
  assert.equal(enabled.expiryMaxDelayMinutes, 10);
  assert.equal(config.getTelegramRuntimeConfig({ ...valid, TELEGRAM_EXPIRY_MAX_DELAY_MINUTES: "16" }).enabled, false);
  assert.equal(config.getTelegramRuntimeConfig({ ...valid, TELEGRAM_BOT_TOKEN: "bad" }).enabled, false);
  assert.equal(config.TELEGRAM_LINK_TOKEN_TTL_SECONDS, 600);
});

test("Telegram API adapter exposes classified errors without leaking token or raw response", async () => {
  const api = moduleLoader()("src/lib/server/telegram/api.ts");
  const env = {
    TELEGRAM_ACCESS_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "12345:" + "z".repeat(40),
    TELEGRAM_BOT_USERNAME: "MustawakAccessBot",
    TELEGRAM_WEBHOOK_SECRET: "w".repeat(32),
    TELEGRAM_SYNC_SECRET: "x".repeat(32),
  };
  await assert.rejects(
    api.callTelegramApi("getMe", {}, {
      env,
      fetchImpl: async () => new Response(JSON.stringify({
        ok: false,
        error_code: 429,
        description: "sensitive upstream text",
        parameters: { retry_after: 7 },
      }), { status: 429, headers: { "content-type": "application/json" } }),
    }),
    (error) => {
      assert.equal(error.category, "rate_limited");
      assert.equal(error.responseCode, 429);
      assert.equal(error.retryAfter, 7);
      assert.doesNotMatch(error.message, /sensitive|zzzz|12345/);
      return true;
    },
  );
});

function accessDb({ subject = true, user = true, entitlements = [], grants = [], guestGrant = null }) {
  return {
    subject: { findFirst: async () => subject ? { id: "subject" } : null },
    user: { findUnique: async () => user ? {
      id: "student", role: "student", isActive: true, emailVerified: new Date(),
    } : null },
    accessEntitlement: { findMany: async () => entitlements },
    codeAccessGrant: {
      findMany: async () => grants,
      findFirst: async () => guestGrant,
    },
  };
}

test("account Telegram access resolves manual and account-code sources without binding one entitlement", async () => {
  const access = moduleLoader({
    "@/lib/prisma": { prisma: {} },
    "@/lib/server/payment-scope": { paymentSubjectWhere: () => ({}) },
  })("src/lib/server/telegram/access.ts");
  const later = new Date(Date.now() + 200_000);
  const decision = await access.resolveTelegramAccountAccess({
    userId: "student",
    subjectId: "subject",
  }, accessDb({
    entitlements: [{ id: "entitlement", expiresAt: null }],
    grants: [{ id: "account-grant", expiresAt: later }],
  }));
  assert.equal(decision.allowed, true);
  assert.equal(decision.expiresAt, null);
  assert.deepEqual(decision.sources.map((item) => item.type).sort(), [
    "account_code_grant",
    "manual_entitlement",
  ]);
});

test("guest Telegram access binds the exact guest grant and never a browser session", async () => {
  const access = moduleLoader({
    "@/lib/prisma": { prisma: {} },
    "@/lib/server/payment-scope": { paymentSubjectWhere: () => ({}) },
  })("src/lib/server/telegram/access.ts");
  const expiresAt = new Date(Date.now() + 200_000);
  const decision = await access.resolveTelegramGuestAccess({
    codeAccessGrantId: "guest-grant",
    subjectId: "subject",
  }, accessDb({ guestGrant: { id: "guest-grant", expiresAt } }));
  assert.equal(decision.allowed, true);
  assert.equal(decision.codeAccessGrantId, "guest-grant");
  assert.deepEqual(decision.sources, [{
    id: "guest-grant",
    type: "guest_code_grant",
    expiresAt,
  }]);
  assert.doesNotMatch(
    readFileSync("src/lib/server/telegram/access.ts", "utf8"),
    /GuestAccessSession|CodeAccessSessionBinding|cookie/i,
  );
});

test("inactive access and ineligible accounts fail closed", async () => {
  const access = moduleLoader({
    "@/lib/prisma": { prisma: {} },
    "@/lib/server/payment-scope": { paymentSubjectWhere: () => ({}) },
  })("src/lib/server/telegram/access.ts");
  assert.equal((await access.resolveTelegramAccountAccess({
    userId: "student", subjectId: "subject",
  }, accessDb({ entitlements: [], grants: [] }))).reason, "access_inactive");
  assert.equal((await access.resolveTelegramAccountAccess({
    userId: "student", subjectId: "subject",
  }, accessDb({ user: false }))).reason, "account_ineligible");
  assert.equal((await access.resolveTelegramGuestAccess({
    codeAccessGrantId: "missing", subjectId: "subject",
  }, accessDb({ guestGrant: null }))).allowed, false);
});

test("runtime foundation is wired without final UI or a production scheduler", () => {
  const files = [
    "src/app/api/v1/student/telegram/route.ts",
    "src/app/api/v1/admin/telegram/route.ts",
    "src/app/api/v1/integrations/telegram/webhook/route.ts",
    "src/app/api/v1/integrations/telegram/sync/route.ts",
  ];
  for (const path of files) assert.equal(readFileSync(path, "utf8").length > 0, true);
  assert.match(readFileSync("src/lib/server/telegram/sync.ts", "utf8"), /creates_join_request:\s*true/);
  assert.match(readFileSync(".env.example", "utf8"), /^TELEGRAM_ACCESS_ENABLED=false$/m);
  assert.match(readFileSync(".env.example", "utf8"), /^TELEGRAM_SYNC_SECRET=$/m);
  const repository = files.concat([
    "src/lib/server/telegram/sync.ts",
    "src/lib/server/telegram/webhook.ts",
  ]).map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(repository, /setWebhook|vercel\.json|cron/);
});

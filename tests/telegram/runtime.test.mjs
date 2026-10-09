import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

test("webhook parser accepts only finite Telegram update identifiers", () => {
  const webhook = moduleLoader({
    "@/lib/prisma": { prisma: {} },
    "@/lib/server/telegram/admin-connect": {},
    "@/lib/server/telegram/api": {},
    "@/lib/server/telegram/audit": {},
    "@/lib/server/telegram/link-tokens": {},
    "@/lib/server/telegram/membership-events": {},
    "@/lib/server/telegram/membership": {},
    "@/lib/server/telegram/sync": {},
    "@/lib/server/telegram/transaction": {},
  })("src/lib/server/telegram/webhook.ts");
  assert.equal(webhook.parseTelegramWebhookUpdate({ update_id: 123 }).update_id, 123);
  assert.throws(() => webhook.parseTelegramWebhookUpdate({}), /telegram_update_invalid/);
  assert.throws(() => webhook.parseTelegramWebhookUpdate({ update_id: Number.MAX_SAFE_INTEGER + 1 }), /telegram_update_invalid/);
});

test("request principal binds guests to the exact active Grant and never persists the cookie identity", async () => {
  let observed;
  const principal = moduleLoader({
    "@/lib/auth-helpers": { getCurrentUser: async () => null },
    "@/lib/prisma": { prisma: { codeAccessSessionBinding: {
      findFirst: async (query) => { observed = query; return { grantId: "grant-1" }; },
    } } },
    "@/lib/server/code-access-cookie": { guestAccessTokenFromRequest: () => "guest-token" },
    "@/lib/server/subscription-code": { hashGuestAccessToken: () => "hashed-cookie" },
  })("src/lib/server/telegram/request-principal.ts");
  const result = await principal.resolveTelegramRequestPrincipal(new Request("https://example.test"), "subject-1");
  assert.deepEqual(result, { type: "guest_grant", codeAccessGrantId: "grant-1" });
  assert.equal(observed.where.grant.subjectId, "subject-1");
  assert.equal(observed.where.grant.principalType, "guest");
  assert.equal(observed.where.session.tokenHash, "hashed-cookie");
  assert.doesNotMatch(JSON.stringify(observed.select), /token|session/i);
});

test("a signed-in non-student cannot fall back to a guest cookie", async () => {
  let guestLookup = 0;
  const principal = moduleLoader({
    "@/lib/auth-helpers": { getCurrentUser: async () => ({
      id: "admin", role: "admin", emailVerified: new Date(), sessionVersion: 0,
    }) },
    "@/lib/prisma": { prisma: { codeAccessSessionBinding: {
      findFirst: async () => { guestLookup += 1; return { grantId: "grant" }; },
    } } },
    "@/lib/server/code-access-cookie": { guestAccessTokenFromRequest: () => "guest-token" },
    "@/lib/server/subscription-code": { hashGuestAccessToken: () => "hash" },
  })("src/lib/server/telegram/request-principal.ts");
  assert.equal(await principal.resolveTelegramRequestPrincipal(
    new Request("https://example.test"),
    "subject",
  ), null);
  assert.equal(guestLookup, 0);
});

function syncHarness({ status, nextCheckAt = new Date(), allowed = true, channelEnabled = true }) {
  const apiCalls = [];
  const updates = [];
  class ApiError extends Error {
    constructor(category) { super("telegram_api_" + category); this.category = category; this.retryAfter = null; }
  }
  const membership = {
    id: "membership-1",
    channelId: "channel-1",
    principalType: "account",
    userId: "student-1",
    codeAccessGrantId: null,
    telegramUserId: "7000000001",
    status,
    nextCheckAt,
    joinedAt: status === "active" ? new Date() : null,
    removedAt: null,
    channel: {
      id: "channel-1",
      subjectId: "subject-1",
      telegramChatId: "-1000000000001",
      isEnabled: channelEnabled,
      status: "connected",
      botCanInviteUsers: true,
      botCanRestrictMembers: true,
    },
  };
  const prisma = {
    telegramMembership: {
      findUnique: async () => membership,
      update: async ({ data }) => { updates.push(data); Object.assign(membership, data); return membership; },
    },
  };
  const load = moduleLoader({
    "@/lib/prisma": { prisma },
    "@/lib/server/telegram/api": {
      TelegramApiError: ApiError,
      callTelegramApi: async (method, payload) => {
        apiCalls.push({ method, payload });
        if (method === "getChatMember") throw new ApiError("rejected");
        if (method === "createChatInviteLink") return { invite_link: "https://t.me/+temporary" };
        return true;
      },
    },
    "@/lib/server/telegram/audit": { appendTelegramAuditEvent: async () => ({}) },
    "@/lib/server/telegram/access": {
      resolveTelegramAccountAccess: async () => ({
        allowed,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      resolveTelegramGuestAccess: async () => ({ allowed: false, expiresAt: null }),
    },
    "@/lib/server/telegram/config": { getTelegramRuntimeConfig: () => ({ expiryMaxDelayMinutes: 15 }) },
    "@/lib/server/telegram/transaction": { telegramTransaction: async (work) => work(prisma) },
  });
  return { sync: load("src/lib/server/telegram/sync.ts"), membership, apiCalls, updates };
}

test("first synchronization sends a join-request invite and does not resend it while pending", async () => {
  const harness = syncHarness({ status: "pending_join" });
  assert.equal((await harness.sync.reconcileTelegramMembership("membership-1", "runtime-test-1")).outcome, "join_link_sent");
  assert.deepEqual(harness.apiCalls.map((item) => item.method), [
    "getChatMember", "createChatInviteLink", "sendMessage",
  ]);
  assert.equal(harness.apiCalls[1].payload.creates_join_request, true);
  assert.equal(harness.membership.nextCheckAt, null);
  const count = harness.apiCalls.length;
  assert.equal((await harness.sync.reconcileTelegramMembership("membership-1", "runtime-test-2")).outcome, "awaiting_join_request");
  assert.equal(harness.apiCalls.length, count);
});

test("disabling a channel does not remove an existing active membership with valid access", async () => {
  const harness = syncHarness({ status: "active", channelEnabled: false });
  assert.equal((await harness.sync.reconcileTelegramMembership("membership-1", "runtime-test-3")).outcome, "active");
  assert.equal(harness.apiCalls.length, 0);
  assert.equal(harness.membership.status, "active");
});

test("inactive access removes the member through ban plus unban", async () => {
  const harness = syncHarness({ status: "active", allowed: false });
  assert.equal((await harness.sync.reconcileTelegramMembership("membership-1", "runtime-test-4")).outcome, "removed");
  assert.deepEqual(harness.apiCalls.map((item) => item.method), ["banChatMember", "unbanChatMember"]);
  assert.equal(harness.membership.status, "removed");
});

test("explicit mass removal bypasses still-active access and removes exactly one membership", async () => {
  const harness = syncHarness({ status: "active", allowed: true, channelEnabled: false });
  assert.equal((await harness.sync.forceRemoveTelegramMembership("membership-1", "mass-runtime-test")).outcome, "removed");
  assert.deepEqual(harness.apiCalls.map((item) => item.method), ["banChatMember", "unbanChatMember"]);
  assert.equal(harness.membership.status, "removed");
});
test("an unknown Telegram join request is declined and audited without approval", async () => {
  const apiCalls = [];
  const auditEvents = [];
  const prisma = {
    telegramSubjectChannel: { findUnique: async () => null },
  };
  const events = moduleLoader({
    "@/lib/prisma": { prisma },
    "@/lib/server/telegram/api": {
      TelegramApiError: class TelegramApiError extends Error {},
      callTelegramApi: async (method, payload) => {
        apiCalls.push({ method, payload });
        return true;
      },
    },
    "@/lib/server/telegram/audit": {
      appendTelegramAuditEvent: async (_tx, event) => {
        auditEvents.push(event);
        return event;
      },
    },
    "@/lib/server/telegram/access": {
      resolveTelegramAccountAccess: async () => ({ allowed: false, expiresAt: null }),
      resolveTelegramGuestAccess: async () => ({ allowed: false, expiresAt: null }),
    },
    "@/lib/server/telegram/config": {
      getTelegramRuntimeConfig: () => ({ expiryMaxDelayMinutes: 15 }),
    },
    "@/lib/server/telegram/sync": { reconcileTelegramMembership: async () => ({}) },
    "@/lib/server/telegram/transaction": {
      telegramTransaction: async (work) => work(prisma),
    },
  })("src/lib/server/telegram/membership-events.ts");

  const result = await events.handleTelegramJoinRequest({
    updateId: "9001",
    chatId: "-1000000000001",
    telegramUserId: "7000000001",
  });

  assert.deepEqual(result, { outcome: "declined" });
  assert.deepEqual(apiCalls.map((item) => item.method), ["declineChatJoinRequest"]);
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].eventType, "join_request_declined");
  assert.equal(auditEvents[0].metadata.reason, "channel_unknown");
});
test("daily Vercel Cron and manual Sync use the same protected runner", () => {
  const webhook = readFileSync("src/app/api/v1/integrations/telegram/webhook/route.ts", "utf8");
  const worker = readFileSync("src/app/api/v1/integrations/telegram/sync/route.ts", "utf8");
  const runner = readFileSync("src/lib/server/telegram/sync-runner.ts", "utf8");
  const sync = readFileSync("src/lib/server/telegram/sync.ts", "utf8");
  const student = readFileSync("src/app/api/v1/student/telegram/route.ts", "utf8");
  const admin = readFileSync("src/app/api/v1/admin/telegram/route.ts", "utf8");
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.match(webhook, /x-telegram-bot-api-secret-token/);
  assert.match(webhook, /safeTelegramSecret/);
  assert.match(worker, /export function GET/);
  assert.match(worker, /export function POST/);
  assert.match(worker, /config\.cronSecret/);
  assert.match(worker, /config\.syncSecret/);
  assert.match(worker, /runTelegramSync/);
  assert.match(runner, /processTelegramSyncJobs/);
  assert.match(runner, /sweepDueTelegramMemberships/);
  assert.match(sync, /FOR UPDATE OF job, membership SKIP LOCKED/);
  assert.match(sync, /FOR UPDATE OF membership SKIP LOCKED/);
  assert.match(student, /consumeAuthLimit/);
  assert.match(student, /requireTelegramOrigin/);
  assert.match(admin, /subscriptions:manage/);
  assert.deepEqual(vercel.crons, [{
    path: "/api/v1/integrations/telegram/sync",
    schedule: "0 1 * * *",
  }]);
  assert.match(readFileSync(".env.example", "utf8"), /^CRON_SECRET=$/m);
  assert.match(readFileSync(".env.example", "utf8"), /^TELEGRAM_EXPIRY_MAX_DELAY_MINUTES=1440$/m);
  assert.doesNotMatch([webhook, worker, student, admin].join("\n"), /console\.|tokenHash|botToken/);
});

test("GET Cron and manual POST reject missing or mismatched independent secrets", async () => {
  class AccessError extends Error {
    constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
  }
  let runs = 0;
  const config = {
    enabled: true,
    cronSecret: "c".repeat(32),
    syncSecret: "s".repeat(32),
  };
  const worker = moduleLoader({
    "@/lib/server/telegram/config": { getTelegramRuntimeConfig: () => config },
    "@/lib/server/telegram/errors": { TelegramAccessError: AccessError },
    "@/lib/server/telegram/http": {
      telegramJson: (body, status = 200) => Response.json(body, { status }),
      telegramErrorResponse: (error) => Response.json(
        { error: error instanceof AccessError ? error.code : "telegram_unavailable" },
        { status: error instanceof AccessError ? error.status : 503 },
      ),
    },
    "@/lib/server/telegram/security": {
      safeTelegramSecret: (expected, provided) => Boolean(expected && provided && expected === provided),
    },
    "@/lib/server/telegram/sync-runner": {
      runTelegramSync: async () => { runs += 1; return { ok: true }; },
    },
  })("src/app/api/v1/integrations/telegram/sync/route.ts");

  assert.equal((await worker.GET(new Request("https://example.test/sync"))).status, 401);
  assert.equal((await worker.GET(new Request("https://example.test/sync", {
    headers: { authorization: "Bearer wrong" },
  }))).status, 401);
  assert.equal(runs, 0);

  assert.equal((await worker.GET(new Request("https://example.test/sync", {
    headers: { authorization: "Bearer " + config.cronSecret },
  }))).status, 200);
  assert.equal(runs, 1);

  assert.equal((await worker.POST(new Request("https://example.test/sync", {
    method: "POST",
    headers: { authorization: "Bearer " + config.cronSecret },
  }))).status, 401);
  assert.equal((await worker.POST(new Request("https://example.test/sync", {
    method: "POST",
    headers: { authorization: "Bearer " + config.syncSecret },
  }))).status, 200);
  assert.equal(runs, 2);

  config.enabled = false;
  assert.equal((await worker.GET(new Request("https://example.test/sync", {
    headers: { authorization: "Bearer " + config.cronSecret },
  }))).status, 404);
  assert.equal(runs, 2);
});
test("only entitlement and Grant revocation enqueue Telegram reconciliation", () => {
  const payment = readFileSync("src/lib/server/payment-admin.ts", "utf8");
  const code = readFileSync("src/lib/server/code-access.ts", "utf8");
  assert.match(payment, /revokePaymentEntitlement[\s\S]*queueTelegramAccountReconciliation[\s\S]*reconcileTelegramMembership/);
  assert.match(code, /revokeCodeAccessGrant[\s\S]*queueTelegramGrantReconciliation[\s\S]*reconcileTelegramMembership/);
  const sessionStart = code.indexOf("export async function revokeCodeAccessSession");
  const grantStart = code.indexOf("export async function revokeCodeAccessGrant");
  assert.ok(sessionStart >= 0 && grantStart > sessionStart);
  assert.doesNotMatch(code.slice(sessionStart, grantStart), /queueTelegram/);
});

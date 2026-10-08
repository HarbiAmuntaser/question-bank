import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

function adminManagementHarness({ enabled = false, memberships = [{ id: "00000000-0000-4000-8000-000000000101" }] } = {}) {
  const state = { apiCalls: 0, jobs: [], audits: [], updates: [] };
  const channel = {
    id: "00000000-0000-4000-8000-000000000001",
    telegramChatId: "-1000000000001",
    isEnabled: enabled,
    status: "connected",
    botCanInviteUsers: true,
    botCanRestrictMembers: true,
    updatedAt: new Date("2026-10-08T00:00:00.000Z"),
  };
  const tx = {
    user: { findUnique: async () => ({ role: "admin", isActive: true, sessionVersion: 2 }) },
    $queryRaw: async () => [{ id: channel.id }],
    telegramSubjectChannel: { findUnique: async () => channel },
    telegramAuditEvent: {
      findUnique: async () => null,
      create: async ({ data }) => { state.audits.push(data); return data; },
    },
    telegramMembership: {
      findMany: async () => memberships,
      updateMany: async ({ data }) => { state.updates.push(data); return { count: memberships.length }; },
    },
    telegramSyncJob: {
      createMany: async ({ data }) => { state.jobs.push(...data); return { count: data.length }; },
    },
  };
  const service = moduleLoader({
    "@/lib/prisma": { prisma: tx },
    "@/lib/server/telegram/api": { callTelegramApi: async () => { state.apiCalls += 1; } },
    "@/lib/server/telegram/audit": {
      appendTelegramAuditEvent: async (_tx, data) => { state.audits.push(data); return data; },
      enqueueTelegramSyncJob: async () => ({ alreadyQueued: false }),
    },
    "@/lib/server/telegram/config": {
      getTelegramRuntimeConfig: () => ({ enabled: true, botToken: "1:" + "a".repeat(30) }),
    },
    "@/lib/server/telegram/security": { telegramBotId: () => "1" },
    "@/lib/server/telegram/transaction": { telegramTransaction: async (work) => work(tx) },
  })("src/lib/server/telegram/admin-management.ts");
  return { service, state, channel };
}

test("mass removal requires a disabled channel and never calls Telegram in the admin request", async () => {
  const blocked = adminManagementHarness({ enabled: true });
  await assert.rejects(blocked.service.queueTelegramMassRemoval({
    channelId: blocked.channel.id,
    expectedUpdatedAt: blocked.channel.updatedAt.toISOString(),
    idempotencyKey: "mass-remove-test-1",
    reason: "Controlled removal test",
    actor: { id: "admin-1", sessionVersion: 2 },
  }), /telegram_disable_channel_first/);
  assert.equal(blocked.state.jobs.length, 0);
  assert.equal(blocked.state.apiCalls, 0);

  const allowed = adminManagementHarness();
  const result = await allowed.service.queueTelegramMassRemoval({
    channelId: allowed.channel.id,
    expectedUpdatedAt: allowed.channel.updatedAt.toISOString(),
    idempotencyKey: "mass-remove-test-2",
    reason: "Controlled removal test",
    actor: { id: "admin-1", sessionVersion: 2 },
  });
  assert.equal(result.queued, 1);
  assert.equal(allowed.state.jobs[0].type, "reconcile_membership");
  assert.match(allowed.state.jobs[0].dedupeKey, /^mass-remove:/);
  assert.equal(allowed.state.apiCalls, 0);
  assert.equal(allowed.state.audits.at(-1).eventType, "mass_removal_queued");
});

test("Phase 3 UI is database-backed by default and external verification is explicit", () => {
  const page = readFileSync("src/app/admin/subscriptions/page.tsx", "utf8");
  const admin = readFileSync("src/components/admin/subscriptions/telegram-admin.tsx", "utf8");
  const student = readFileSync("src/components/public/telegram-subject-access.tsx", "utf8");
  const subject = readFileSync("src/components/public/subject-details.tsx", "utf8");
  const route = readFileSync("src/app/api/v1/admin/telegram/route.ts", "utf8");
  assert.match(page, /if \(!activeTab\)/);
  assert.match(admin, /action: "verify_channel"/);
  assert.match(admin, /mode="mass_remove"/);
  assert.match(admin, /REMOVE ALL TELEGRAM MEMBERS/);
  assert.match(route, /subscriptions:manage/);
  assert.match(route, /consumeAuthLimit/);
  assert.doesNotMatch(student, /api\.telegram\.org|callTelegramApi|botToken|tokenHash/);
  assert.match(subject, /telegramSubjectIsAvailable/);
  assert.match(readFileSync("src/lib/server/telegram/sync.ts", "utf8"), /dedupeKey\.startsWith\("mass-remove:"\)/);
  const links = readFileSync("src/lib/server/telegram/link-tokens.ts", "utf8");
  assert.ok(links.indexOf("channelCandidate.id} FOR UPDATE") < links.indexOf("id: channelCandidate.id"));
  const connect = readFileSync("src/lib/server/telegram/admin-connect.ts", "utf8");
  assert.match(connect, /existing\.status === "disconnected" && state\.status !== "disconnected" && !reconnectToken/);
});

test("Telegram readiness is fail-closed without printing configuration values", () => {
  const source = readFileSync("scripts/telegram-readiness.mjs", "utf8");
  assert.match(source, /TELEGRAM_ACCESS_ENABLED/);
  assert.match(source, /externalVerificationRequired/);
  assert.doesNotMatch(source, /console\.log\([^)]*TELEGRAM_BOT_TOKEN/);
  assert.doesNotMatch(source, /console\.log\([^)]*TELEGRAM_.*SECRET/);
});

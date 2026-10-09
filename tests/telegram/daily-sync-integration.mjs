import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

import { moduleLoader } from "../admin/load-module.mjs";

const rawUrl = process.env.TELEGRAM_TEST_DATABASE_URL;
assert.ok(rawUrl, "TELEGRAM_TEST_DATABASE_URL is required");
const url = new URL(rawUrl);
assert.ok(url.hostname.endsWith(".neon.tech"), "An isolated Neon database is required");
assert.equal(process.env.TELEGRAM_TEST_ISOLATED, "true", "Explicit isolated confirmation is required");

process.env.TELEGRAM_ACCESS_ENABLED = "true";
process.env.TELEGRAM_BOT_TOKEN = "12345:" + "t".repeat(40);
process.env.TELEGRAM_BOT_USERNAME = "MustawakAccessBot";
process.env.TELEGRAM_WEBHOOK_SECRET = "w".repeat(32);
process.env.TELEGRAM_SYNC_SECRET = "s".repeat(32);
process.env.CRON_SECRET = "c".repeat(32);
process.env.TELEGRAM_EXPIRY_MAX_DELAY_MINUTES = "1440";

const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
const suffix = randomUUID().slice(0, 8);
const ids = {
  admin: randomUUID(),
  jobStudent: randomUUID(),
  sweepStudent: randomUUID(),
  university: randomUUID(),
  major: randomUUID(),
  jobSubject: randomUUID(),
  sweepSubject: randomUUID(),
  jobEntitlement: randomUUID(),
  sweepEntitlement: randomUUID(),
  jobChannel: randomUUID(),
  sweepChannel: randomUUID(),
  jobMembership: randomUUID(),
  sweepMembership: randomUUID(),
  job: randomUUID(),
};
const apiCalls = [];

class FakeTelegramApiError extends Error {
  constructor(category, retryAfter = null) {
    super("telegram_api_" + category);
    this.category = category;
    this.retryAfter = retryAfter;
  }
}

function runtime(client) {
  return moduleLoader({
    "@/lib/prisma": { prisma: client },
    "@/lib/auth-helpers": { getCurrentUser: async () => null },
    "next/cache": { unstable_cache: (fn) => fn },
    "@/lib/server/telegram/api": {
      TelegramApiError: FakeTelegramApiError,
      callTelegramApi: async (method, payload) => {
        apiCalls.push({ method, membership: String(payload.user_id ?? "") });
        return true;
      },
    },
  });
}

function sum(results, section, key) {
  return results.reduce((total, result) => total + result[section][key], 0);
}

try {
  const now = new Date();
  const quiesceUntil = new Date(now.getTime() + 7 * 86_400_000);
  await prisma.$transaction([
    prisma.telegramSyncJob.updateMany({
      where: { status: { in: ['pending', 'processing', 'failed'] } },
      data: { status: 'pending', availableAt: quiesceUntil, lockedAt: null },
    }),
    prisma.telegramMembership.updateMany({
      where: { nextCheckAt: { lte: now } },
      data: { nextCheckAt: quiesceUntil },
    }),
  ]);
  const startsAt = new Date(now.getTime() - 2 * 86_400_000);
  const initiallyActiveUntil = new Date(now.getTime() + 86_400_000);
  const expiredAt = new Date(now.getTime() - 60_000);
  const dueAt = new Date(now.getTime() - 120_000);

  await prisma.user.createMany({
    data: [
      {
        id: ids.admin,
        email: `daily-admin-${suffix}@example.test`,
        normalizedEmail: `daily-admin-${suffix}@example.test`,
        password: "isolated-hash",
        role: "admin",
        isActive: true,
      },
      {
        id: ids.jobStudent,
        email: `daily-job-${suffix}@example.test`,
        normalizedEmail: `daily-job-${suffix}@example.test`,
        role: "student",
        isActive: true,
        emailVerified: now,
      },
      {
        id: ids.sweepStudent,
        email: `daily-sweep-${suffix}@example.test`,
        normalizedEmail: `daily-sweep-${suffix}@example.test`,
        role: "student",
        isActive: true,
        emailVerified: now,
      },
    ],
  });
  await prisma.university.create({
    data: {
      id: ids.university,
      name: "Daily sync isolated " + suffix,
      code: "DS-" + suffix,
      countryCode: "SA",
      institutionType: "university",
    },
  });
  await prisma.major.create({
    data: {
      id: ids.major,
      universityId: ids.university,
      name: "Daily sync major " + suffix,
      code: "DSM-" + suffix,
    },
  });
  await prisma.subject.createMany({
    data: [
      { id: ids.jobSubject, majorId: ids.major, name: "Daily job " + suffix, code: "DSJ-" + suffix },
      { id: ids.sweepSubject, majorId: ids.major, name: "Daily sweep " + suffix, code: "DSS-" + suffix },
    ],
  });
  await prisma.accessEntitlement.createMany({
    data: [
      {
        id: ids.jobEntitlement,
        userId: ids.jobStudent,
        subjectId: ids.jobSubject,
        scopeType: "subject",
        startsAt,
        expiresAt: initiallyActiveUntil,
      },
      {
        id: ids.sweepEntitlement,
        userId: ids.sweepStudent,
        subjectId: ids.sweepSubject,
        scopeType: "subject",
        startsAt,
        expiresAt: initiallyActiveUntil,
      },
    ],
  });
  await prisma.telegramSubjectChannel.createMany({
    data: [
      {
        id: ids.jobChannel,
        subjectId: ids.jobSubject,
        telegramChatId: "-18" + String(Date.now()).slice(-10) + "01",
        title: "Daily job private",
        status: "connected",
        isEnabled: true,
        botCanInviteUsers: true,
        botCanRestrictMembers: true,
        verifiedAt: now,
        lastHealthCheckedAt: now,
        createdBy: ids.admin,
      },
      {
        id: ids.sweepChannel,
        subjectId: ids.sweepSubject,
        telegramChatId: "-18" + String(Date.now()).slice(-10) + "02",
        title: "Daily sweep private",
        status: "connected",
        isEnabled: true,
        botCanInviteUsers: true,
        botCanRestrictMembers: true,
        verifiedAt: now,
        lastHealthCheckedAt: now,
        createdBy: ids.admin,
      },
    ],
  });
  await prisma.telegramMembership.createMany({
    data: [
      {
        id: ids.jobMembership,
        channelId: ids.jobChannel,
        principalType: "account",
        userId: ids.jobStudent,
        telegramUserId: "79" + String(Date.now()).slice(-8) + "01",
        status: "active",
        accessExpiresAt: initiallyActiveUntil,
        nextCheckAt: dueAt,
        joinedAt: startsAt,
      },
      {
        id: ids.sweepMembership,
        channelId: ids.sweepChannel,
        principalType: "account",
        userId: ids.sweepStudent,
        telegramUserId: "79" + String(Date.now()).slice(-8) + "02",
        status: "active",
        accessExpiresAt: initiallyActiveUntil,
        nextCheckAt: dueAt,
        joinedAt: startsAt,
      },
    ],
  });

  await prisma.accessEntitlement.updateMany({
    where: { id: { in: [ids.jobEntitlement, ids.sweepEntitlement] } },
    data: { expiresAt: expiredAt },
  });
  await prisma.telegramSyncJob.create({
    data: {
      id: ids.job,
      type: "reconcile_membership",
      channelId: ids.jobChannel,
      membershipId: ids.jobMembership,
      dedupeKey: "daily-expiry:" + ids.jobMembership,
      availableAt: dueAt,
    },
  });

  const access = runtime(prisma)("src/lib/server/telegram/access.ts");
  assert.equal((await access.resolveTelegramAccountAccess({
    userId: ids.jobStudent,
    subjectId: ids.jobSubject,
    now,
  })).allowed, false, "website access must expire before Telegram cleanup");

  const firstRunner = runtime(prisma)("src/lib/server/telegram/sync-runner.ts");
  const secondRunner = runtime(second)("src/lib/server/telegram/sync-runner.ts");
  const concurrent = await Promise.all([
    firstRunner.runTelegramSync(),
    secondRunner.runTelegramSync(),
  ]);

  assert.equal(sum(concurrent, "queued", "processed"), 1);
  assert.equal(sum(concurrent, "queued", "failed"), 0);
  assert.equal(sum(concurrent, "due", "claimed"), 1);
  assert.equal(sum(concurrent, "due", "processed"), 1);
  assert.equal(sum(concurrent, "due", "failed"), 0);
  assert.equal(apiCalls.filter((call) => call.method === "banChatMember").length, 2);
  assert.equal(apiCalls.filter((call) => call.method === "unbanChatMember").length, 2);

  const [jobMembership, sweepMembership, job] = await Promise.all([
    prisma.telegramMembership.findUniqueOrThrow({ where: { id: ids.jobMembership } }),
    prisma.telegramMembership.findUniqueOrThrow({ where: { id: ids.sweepMembership } }),
    prisma.telegramSyncJob.findUniqueOrThrow({ where: { id: ids.job } }),
  ]);
  assert.equal(jobMembership.status, "removed");
  assert.equal(sweepMembership.status, "removed");
  assert.equal(job.status, "completed");
  assert.equal(job.attempts, 1);
  assert.equal(await prisma.telegramAuditEvent.count({
    where: {
      membershipId: { in: [ids.jobMembership, ids.sweepMembership] },
      eventType: "membership_removed",
    },
  }), 2);

  const callsAfterFirstRun = apiCalls.length;
  const repeated = await Promise.all([
    firstRunner.runTelegramSync(),
    secondRunner.runTelegramSync(),
  ]);
  assert.equal(sum(repeated, "queued", "processed"), 0);
  assert.equal(sum(repeated, "due", "claimed"), 0);
  assert.equal(apiCalls.length, callsAfterFirstRun);
  assert.equal(await prisma.telegramSyncJob.count({ where: { dedupeKey: "daily-expiry:" + ids.jobMembership } }), 1);

  console.log(JSON.stringify({
    passed: 1,
    scenario: "daily-sync-concurrency-idempotency",
    jobAttempts: job.attempts,
    removedMemberships: 2,
    duplicateTelegramCalls: 0,
    isolatedHost: url.hostname,
    productionTouched: false,
  }));
} finally {
  await second.$disconnect();
  await prisma.$disconnect();
}

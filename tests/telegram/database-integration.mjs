import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
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
process.env.TELEGRAM_WEBHOOK_SECRET = "s".repeat(32);
process.env.PAYMENT_CODES_ENABLED = "true";

const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
const suffix = randomUUID().slice(0, 8);
const ids = {
  admin: randomUUID(),
  manualStudent: randomUUID(),
  codeStudent: randomUUID(),
  university: randomUUID(),
  major: randomUUID(),
  manualSubject: randomUUID(),
  accountCodeSubject: randomUUID(),
  guestSubject: randomUUID(),
  connectSubject: randomUUID(),
  manualPlan: randomUUID(),
  accountPlan: randomUUID(),
  guestPlan: randomUUID(),
};

function load(client) {
  return moduleLoader({
    "@/lib/prisma": { prisma: client },
    "next/cache": { unstable_cache: (fn) => fn },
    "@/lib/auth-helpers": { getCurrentUser: async () => null },
  });
}

function rawCode() {
  return "QB-" + randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

async function createCode(planId) {
  const value = rawCode();
  const code = await prisma.subscriptionCode.create({
    data: {
      planId,
      codeHash: createHash("sha256").update(value.replaceAll("-", "")).digest("hex"),
      codePreview: "QB-TEST",
      supportReference: "AC-" + randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase().replace(/[01]/g, "2"),
      durationDays: 7,
      maxUses: 1,
      maxBrowserSessions: 1,
    },
  });
  return { code, value };
}

let passed = 0;
async function check(name, work) {
  await work();
  passed += 1;
  console.log("PASS telegram-core " + passed + ": " + name);
}

try {
  const now = new Date();
  await prisma.user.createMany({
    data: [
      {
        id: ids.admin,
        email: "tg-admin-" + suffix + "@example.test",
        normalizedEmail: "tg-admin-" + suffix + "@example.test",
        password: "isolated-hash",
        role: "admin",
        isActive: true,
      },
      {
        id: ids.manualStudent,
        email: "tg-manual-" + suffix + "@example.test",
        normalizedEmail: "tg-manual-" + suffix + "@example.test",
        role: "student",
        isActive: true,
        emailVerified: now,
      },
      {
        id: ids.codeStudent,
        email: "tg-code-" + suffix + "@example.test",
        normalizedEmail: "tg-code-" + suffix + "@example.test",
        role: "student",
        isActive: true,
        emailVerified: now,
      },
    ],
  });
  await prisma.university.create({
    data: {
      id: ids.university,
      name: "Telegram isolated " + suffix,
      code: "TG-" + suffix,
      countryCode: "SA",
      institutionType: "university",
    },
  });
  await prisma.major.create({
    data: {
      id: ids.major,
      universityId: ids.university,
      name: "Telegram major " + suffix,
      code: "TGM-" + suffix,
    },
  });
  await prisma.subject.createMany({
    data: [
      { id: ids.manualSubject, majorId: ids.major, name: "Manual " + suffix, code: "TM-" + suffix },
      { id: ids.accountCodeSubject, majorId: ids.major, name: "Account " + suffix, code: "TA-" + suffix },
      { id: ids.guestSubject, majorId: ids.major, name: "Guest " + suffix, code: "TG-" + suffix },
      { id: ids.connectSubject, majorId: ids.major, name: "Connect " + suffix, code: "TC-" + suffix },
    ],
  });
  await prisma.paidAccessPlan.createMany({
    data: [
      {
        id: ids.manualPlan,
        scopeType: "subject",
        subjectId: ids.manualSubject,
        title: "Manual Telegram",
        isActive: true,
        activationCodesEnabled: true,
        defaultDurationDays: 7,
      },
      {
        id: ids.accountPlan,
        scopeType: "subject",
        subjectId: ids.accountCodeSubject,
        title: "Account Telegram",
        isActive: true,
        activationCodesEnabled: true,
        defaultDurationDays: 7,
      },
      {
        id: ids.guestPlan,
        scopeType: "subject",
        subjectId: ids.guestSubject,
        title: "Guest Telegram",
        isActive: true,
        activationCodesEnabled: true,
        defaultDurationDays: 7,
      },
    ],
  });
  const manualEntitlement = await prisma.accessEntitlement.create({
    data: {
      userId: ids.manualStudent,
      subjectId: ids.manualSubject,
      scopeType: "subject",
      startsAt: now,
      expiresAt: new Date(now.getTime() + 7 * 86_400_000),
    },
  });

  const codeAccess = load(prisma)("src/lib/server/code-access.ts");
  const accountCode = await createCode(ids.accountPlan);
  const accountActivation = await codeAccess.activateCodeAccess({
    code: accountCode.value,
    subjectId: ids.accountCodeSubject,
    idempotencyKey: randomUUID(),
    principal: { type: "account", user: { id: ids.codeStudent, sessionVersion: 0 } },
  });
  const guestCode = await createCode(ids.guestPlan);
  const guestActivation = await codeAccess.activateCodeAccess({
    code: guestCode.value,
    subjectId: ids.guestSubject,
    idempotencyKey: randomUUID(),
    principal: { type: "guest" },
  });

  const channels = {};
  let chat = 1000000000000;
  for (const [key, subjectId] of [
    ["manual", ids.manualSubject],
    ["account", ids.accountCodeSubject],
    ["guest", ids.guestSubject],
  ]) {
    channels[key] = await prisma.telegramSubjectChannel.create({
      data: {
        subjectId,
        telegramChatId: "-" + String(chat++),
        title: "Private " + key,
        isEnabled: true,
        status: "connected",
        botCanInviteUsers: true,
        botCanRestrictMembers: true,
        verifiedAt: now,
        lastHealthCheckedAt: now,
        createdBy: ids.admin,
      },
    });
  }

  const access = load(prisma)("src/lib/server/telegram/access.ts");
  await check("resolver accepts manual entitlement, account grant and exact guest grant", async () => {
    const manual = await access.resolveTelegramAccountAccess({
      userId: ids.manualStudent,
      subjectId: ids.manualSubject,
    });
    const account = await access.resolveTelegramAccountAccess({
      userId: ids.codeStudent,
      subjectId: ids.accountCodeSubject,
    });
    const guest = await access.resolveTelegramGuestAccess({
      codeAccessGrantId: guestActivation.grant.id,
      subjectId: ids.guestSubject,
    });
    assert.equal(manual.allowed, true);
    assert.equal(manual.sources[0].id, manualEntitlement.id);
    assert.equal(account.allowed, true);
    assert.equal(account.sources[0].id, accountActivation.grant.id);
    assert.equal(guest.allowed, true);
    assert.equal(guest.sources[0].id, guestActivation.grant.id);
    await assert.rejects(access.resolveTelegramGuestAccess({
      codeAccessGrantId: guestActivation.grant.id,
      subjectId: ids.manualSubject,
    }).then((result) => {
      assert.equal(result.allowed, false);
      if (!result.allowed) throw new Error("expected_denied");
    }), /expected_denied/);
  });

  const links = load(prisma)("src/lib/server/telegram/link-tokens.ts");
  const secondLinks = load(second)("src/lib/server/telegram/link-tokens.ts");
  await check("one pending admin connect per Admin is enforced under concurrency", async () => {
    const attempts = await Promise.allSettled([
      links.issueTelegramAdminConnectToken({
        subjectId: ids.connectSubject,
        admin: { id: ids.admin, sessionVersion: 0 },
      }),
      secondLinks.issueTelegramAdminConnectToken({
        subjectId: ids.connectSubject,
        admin: { id: ids.admin, sessionVersion: 0 },
      }),
    ]);
    assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((item) => item.status === "rejected").length, 1);
    assert.equal(await prisma.telegramLinkToken.count({
      where: { purpose: "admin_connect", activeKey: "admin:" + ids.admin },
    }), 1);
  });

  await check("student token stores only hash, lasts ten minutes and concurrent claim has one winner", async () => {
    const issued = await links.issueTelegramStudentLinkToken({
      subjectId: ids.manualSubject,
      principal: { type: "account", user: { id: ids.manualStudent, sessionVersion: 0 } },
    });
    const stored = await prisma.telegramLinkToken.findUniqueOrThrow({ where: { id: issued.id } });
    assert.notEqual(stored.tokenHash, issued.rawToken);
    assert.equal(stored.tokenHash, links.hashTelegramLinkToken(issued.rawToken));
    assert.ok(Math.abs(stored.expiresAt.getTime() - stored.createdAt.getTime() - 600_000) < 1_000);
    assert.equal(JSON.stringify(await prisma.telegramAuditEvent.findMany({
      where: { linkTokenId: stored.id },
    })).includes(issued.rawToken), false);

    const claims = await Promise.allSettled([
      links.claimTelegramLinkToken({ rawToken: issued.rawToken, telegramUserId: "7000000001" }),
      secondLinks.claimTelegramLinkToken({ rawToken: issued.rawToken, telegramUserId: "7000000001" }),
    ]);
    assert.equal(claims.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(claims.filter((item) => item.status === "rejected").length, 1);
    await assert.rejects(
      links.claimTelegramLinkToken({ rawToken: issued.rawToken, telegramUserId: "7000000001" }),
      /telegram_link_invalid/,
    );
    assert.equal(await prisma.telegramAuditEvent.count({
      where: { linkTokenId: stored.id, eventType: "student_identity_linked" },
    }), 1);
    await assert.rejects(prisma.telegramLinkToken.update({
      where: { id: stored.id },
      data: { telegramUserId: "7000000099" },
    }));
    const consumed = await links.consumeTelegramLinkToken({
      tokenId: stored.id,
      telegramUserId: "7000000001",
      idempotencyKey: "link-consumed:" + stored.id,
    });
    assert.equal(consumed.alreadyConsumed, false);
  });

  await check("guest token uses the Grant and remains independent of browser bindings", async () => {
    const issued = await links.issueTelegramStudentLinkToken({
      subjectId: ids.guestSubject,
      principal: { type: "guest_grant", codeAccessGrantId: guestActivation.grant.id },
    });
    const claimed = await links.claimTelegramLinkToken({
      rawToken: issued.rawToken,
      telegramUserId: "7000000002",
    });
    assert.equal(claimed.codeAccessGrantId, guestActivation.grant.id);
    assert.equal(claimed.userId, null);
    assert.equal((await prisma.telegramLinkToken.findUniqueOrThrow({
      where: { id: issued.id },
    })).codeAccessGrantId, guestActivation.grant.id);
  });

  await check("audit is immutable and outbox enqueue is idempotent", async () => {
    const membership = await prisma.telegramMembership.create({
      data: {
        channelId: channels.manual.id,
        principalType: "account",
        userId: ids.manualStudent,
        telegramUserId: "7000000001",
        status: "pending_join",
        accessExpiresAt: manualEntitlement.expiresAt,
        nextCheckAt: manualEntitlement.expiresAt,
      },
    });
    const audit = load(prisma)("src/lib/server/telegram/audit.ts");
    const enqueue = () => prisma.$transaction((tx) => audit.enqueueTelegramSyncJob(tx, {
      type: "reconcile_membership",
      channelId: channels.manual.id,
      membershipId: membership.id,
      dedupeKey: "reconcile:" + membership.id + ":test",
      actorType: "system",
      auditIdempotencyKey: "sync-queued:" + membership.id + ":test",
      metadata: { reason: "integration_test" },
    }));
    assert.equal((await enqueue()).alreadyQueued, false);
    assert.equal((await enqueue()).alreadyQueued, true);
    assert.equal(await prisma.telegramSyncJob.count({
      where: { membershipId: membership.id },
    }), 1);
    const event = await prisma.telegramAuditEvent.findFirstOrThrow({
      where: { membershipId: membership.id, eventType: "sync_queued" },
    });
    await assert.rejects(prisma.telegramAuditEvent.update({
      where: { id: event.id },
      data: { metadata: { changed: true } },
    }));
    await assert.rejects(prisma.telegramAuditEvent.delete({ where: { id: event.id } }));
    await assert.rejects(prisma.$transaction((tx) => audit.appendTelegramAuditEvent(tx, {
      eventType: "unsafe_event",
      actorType: "system",
      idempotencyKey: "unsafe-event:" + randomUUID(),
      metadata: { botToken: "must-not-be-stored" },
    })), /telegram_audit_metadata_sensitive/);
  });

  await check("database rejects cross-principal guest membership", async () => {
    await assert.rejects(prisma.telegramMembership.create({
      data: {
        channelId: channels.guest.id,
        principalType: "guest_grant",
        codeAccessGrantId: accountActivation.grant.id,
        telegramUserId: "7000000003",
      },
    }));
  });

  console.log(JSON.stringify({
    passed,
    isolatedHost: url.hostname,
    migrationsExpected: 37,
    productionTouched: false,
  }));
} finally {
  await second.$disconnect();
  await prisma.$disconnect();
}

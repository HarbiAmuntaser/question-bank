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
process.env.TELEGRAM_SYNC_SECRET = "y".repeat(32);
process.env.PAYMENT_CODES_ENABLED = "true";

const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
const suffix = randomUUID().slice(0, 8);
const telegramSeed = String(Date.now()).slice(-9);
const telegramIds = {
  admin: "71" + telegramSeed + "00",
  accountPrimary: "71" + telegramSeed + "01",
  accountCompetitor: "71" + telegramSeed + "02",
  immutableProbe: "71" + telegramSeed + "03",
  guest: "71" + telegramSeed + "04",
  guestConflict: "71" + telegramSeed + "05",
  accountOverlap: "71" + telegramSeed + "06",
  invalid: "71" + telegramSeed + "07",
};
let telegramUpdateSequence = 0;
function nextTelegramUpdateId() {
  telegramUpdateSequence += 1;
  return String(Date.now() * 100 + telegramUpdateSequence);
}
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
    "@/lib/server/telegram/sync": { reconcileTelegramMembership: async () => ({ outcome: "mocked" }) },
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
  let chat = Number("1" + telegramSeed + "000");
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
  let adminConnectToken;
  let accountMembership;
  let guestMembership;

  await check("one pending Admin connect is enforced and bot channel connection is a separate step", async () => {
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
    const fulfilled = attempts.find((item) => item.status === "fulfilled");
    assert.ok(fulfilled);
    adminConnectToken = fulfilled.value;
    assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((item) => item.status === "rejected").length, 1);
    const adminTelegramId = telegramIds.admin;
    await links.claimTelegramLinkToken({
      rawToken: adminConnectToken.rawToken,
      telegramUserId: adminTelegramId,
    });
    const connect = load(prisma)("src/lib/server/telegram/admin-connect.ts");
    const connected = await connect.applyTelegramBotMembershipUpdate({
      updateId: nextTelegramUpdateId(),
      actorTelegramUserId: adminTelegramId,
      chatId: "-1" + telegramSeed + "99",
      chatType: "channel",
      chatTitle: "Isolated private channel",
      chatUsername: null,
      memberUserId: "12345",
      memberStatus: "administrator",
      canInviteUsers: true,
      canRestrictMembers: true,
    });
    assert.equal(connected.outcome, "connected");
    assert.equal(connected.channel.isEnabled, false);
    assert.equal((await prisma.telegramLinkToken.findUniqueOrThrow({
      where: { id: adminConnectToken.id },
    })).state, "consumed");
  });

  await check("student token is hashed, identity race has one winner and same-user retry is idempotent", async () => {
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
      links.claimTelegramLinkToken({ rawToken: issued.rawToken, telegramUserId: telegramIds.accountPrimary }),
      secondLinks.claimTelegramLinkToken({ rawToken: issued.rawToken, telegramUserId: telegramIds.accountCompetitor }),
    ]);
    assert.equal(claims.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(claims.filter((item) => item.status === "rejected").length, 1);
    const winner = claims.find((item) => item.status === "fulfilled").value;
    const replay = await links.claimTelegramLinkToken({
      rawToken: issued.rawToken,
      telegramUserId: winner.telegramUserId,
    });
    assert.equal(replay.alreadyClaimed, true);
    assert.equal(await prisma.telegramAuditEvent.count({
      where: { linkTokenId: stored.id, eventType: "student_identity_linked" },
    }), 1);
    await assert.rejects(prisma.telegramLinkToken.update({
      where: { id: stored.id },
      data: { telegramUserId: telegramIds.immutableProbe },
    }));

    const membership = load(prisma)("src/lib/server/telegram/membership.ts");
    const completed = await membership.completeTelegramStudentLink({
      tokenId: stored.id,
      telegramUserId: winner.telegramUserId,
      telegramUpdateId: nextTelegramUpdateId(),
    });
    accountMembership = completed.membership;
    assert.equal(accountMembership.userId, ids.manualStudent);
    assert.equal(accountMembership.codeAccessGrantId, null);
    assert.equal((await prisma.telegramLinkToken.findUniqueOrThrow({ where: { id: stored.id } })).state, "consumed");
    assert.equal(await prisma.telegramSyncJob.count({
      where: { membershipId: accountMembership.id, status: "pending" },
    }), 1);
  });

  await check("guest membership binds the exact Grant and explicit renewal can relink only the same Telegram identity", async () => {
    const issued = await links.issueTelegramStudentLinkToken({
      subjectId: ids.guestSubject,
      principal: { type: "guest_grant", codeAccessGrantId: guestActivation.grant.id },
    });
    const telegramUserId = telegramIds.guest;
    const claimed = await links.claimTelegramLinkToken({
      rawToken: issued.rawToken,
      telegramUserId,
    });
    assert.equal(claimed.codeAccessGrantId, guestActivation.grant.id);
    assert.equal(claimed.userId, null);
    const membershipService = load(prisma)("src/lib/server/telegram/membership.ts");
    guestMembership = (await membershipService.completeTelegramStudentLink({
      tokenId: claimed.id,
      telegramUserId,
      telegramUpdateId: nextTelegramUpdateId(),
    })).membership;
    assert.equal(guestMembership.codeAccessGrantId, guestActivation.grant.id);

    await codeAccess.revokeCodeAccessGrant({
      grantId: guestActivation.grant.id,
      idempotencyKey: randomUUID(),
      reason: "Isolated guest renewal replacement",
      actor: { id: ids.admin, sessionVersion: 0 },
    });
    assert.equal(await prisma.telegramSyncJob.count({
      where: { membershipId: guestMembership.id, status: "pending" },
    }) >= 1, true);

    const replacementCode = await createCode(ids.guestPlan);
    const replacement = await codeAccess.activateCodeAccess({
      code: replacementCode.value,
      subjectId: ids.guestSubject,
      idempotencyKey: randomUUID(),
      principal: { type: "guest" },
    });
    const replacementToken = await links.issueTelegramStudentLinkToken({
      subjectId: ids.guestSubject,
      principal: { type: "guest_grant", codeAccessGrantId: replacement.grant.id },
    });
    const replacementClaim = await links.claimTelegramLinkToken({
      rawToken: replacementToken.rawToken,
      telegramUserId,
    });
    const relinked = await membershipService.completeTelegramStudentLink({
      tokenId: replacementClaim.id,
      telegramUserId,
      telegramUpdateId: nextTelegramUpdateId(),
    });
    assert.equal(relinked.membership.id, guestMembership.id);
    assert.equal(relinked.membership.codeAccessGrantId, replacement.grant.id);
    assert.equal(await prisma.telegramAuditEvent.count({
      where: { membershipId: guestMembership.id, eventType: "guest_membership_relinked" },
    }), 1);

    const conflictToken = await links.issueTelegramStudentLinkToken({
      subjectId: ids.guestSubject,
      principal: { type: "guest_grant", codeAccessGrantId: replacement.grant.id },
    });
    const conflictClaim = await links.claimTelegramLinkToken({
      rawToken: conflictToken.rawToken,
      telegramUserId: telegramIds.guestConflict,
    });
    await assert.rejects(membershipService.completeTelegramStudentLink({
      tokenId: conflictClaim.id,
      telegramUserId: telegramIds.guestConflict,
      telegramUpdateId: nextTelegramUpdateId(),
    }), /telegram_grant_identity_conflict/);
  });

  await check("account membership remains eligible when one of multiple access sources is revoked", async () => {
    const overlappingEntitlement = await prisma.accessEntitlement.create({
      data: {
        userId: ids.codeStudent,
        subjectId: ids.accountCodeSubject,
        scopeType: "subject",
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 86_400_000),
      },
    });
    const token = await links.issueTelegramStudentLinkToken({
      subjectId: ids.accountCodeSubject,
      principal: { type: "account", user: { id: ids.codeStudent, sessionVersion: 0 } },
    });
    const claimed = await links.claimTelegramLinkToken({
      rawToken: token.rawToken,
      telegramUserId: telegramIds.accountOverlap,
    });
    const membershipService = load(prisma)("src/lib/server/telegram/membership.ts");
    const overlappingMembership = (await membershipService.completeTelegramStudentLink({
      tokenId: claimed.id,
      telegramUserId: telegramIds.accountOverlap,
      telegramUpdateId: nextTelegramUpdateId(),
    })).membership;
    await prisma.telegramMembership.update({
      where: { id: overlappingMembership.id },
      data: { status: "active", joinedAt: new Date(), nextCheckAt: new Date() },
    });
    const paymentAdmin = moduleLoader({
      "@/lib/prisma": { prisma },
      "@/lib/auth-helpers": { getCurrentUser: async () => ({
        id: ids.admin,
        role: "admin",
        isActive: true,
        emailVerified: new Date(),
        sessionVersion: 0,
      }) },
      "next/cache": { unstable_cache: (fn) => fn },
      "@/lib/server/telegram/sync": { reconcileTelegramMembership: async () => ({ outcome: "mocked" }) },
    })("src/lib/server/payment-admin.ts");
    await paymentAdmin.revokePaymentEntitlement(overlappingEntitlement.id, {
      reason: "Isolated account source revocation",
      expectedUpdatedAt: overlappingEntitlement.updatedAt.toISOString(),
    });
    const decision = await access.resolveTelegramAccountAccess({
      userId: ids.codeStudent,
      subjectId: ids.accountCodeSubject,
    });
    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.sources.map((source) => source.type), ["account_code_grant"]);
    assert.equal((await prisma.telegramMembership.findUniqueOrThrow({
      where: { id: overlappingMembership.id },
    })).status, "active");
    assert.equal(await prisma.telegramSyncJob.count({
      where: { membershipId: overlappingMembership.id, status: "pending" },
    }) >= 1, true);
  });
  await check("audit is immutable and outbox enqueue is idempotent", async () => {
    const audit = load(prisma)("src/lib/server/telegram/audit.ts");
    const enqueue = () => prisma.$transaction((tx) => audit.enqueueTelegramSyncJob(tx, {
      type: "reconcile_membership",
      channelId: channels.manual.id,
      membershipId: accountMembership.id,
      dedupeKey: "reconcile:" + accountMembership.id + ":test",
      actorType: "system",
      auditIdempotencyKey: "sync-queued:" + accountMembership.id + ":test",
      metadata: { reason: "integration_test" },
    }));
    assert.equal((await enqueue()).alreadyQueued, false);
    assert.equal((await enqueue()).alreadyQueued, true);
    assert.equal(await prisma.telegramSyncJob.count({
      where: { dedupeKey: "reconcile:" + accountMembership.id + ":test" },
    }), 1);
    const event = await prisma.telegramAuditEvent.findFirstOrThrow({
      where: { idempotencyKey: "sync-queued:" + accountMembership.id + ":test" },
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
  await check("admin mass removal is audited and queues schema-valid per-membership jobs", async () => {
    const management = load(prisma)("src/lib/server/telegram/admin-management.ts");
    const initial = await prisma.telegramSubjectChannel.findUniqueOrThrow({
      where: { id: channels.manual.id },
    });
    await management.setTelegramChannelEnabled({
      channelId: initial.id,
      enabled: false,
      expectedUpdatedAt: initial.updatedAt.toISOString(),
      idempotencyKey: "channel-disable:" + suffix,
      reason: "Isolated mass removal preparation",
      actor: { id: ids.admin, sessionVersion: 0 },
    });
    const disabled = await prisma.telegramSubjectChannel.findUniqueOrThrow({
      where: { id: channels.manual.id },
    });
    const queued = await management.queueTelegramMassRemoval({
      channelId: disabled.id,
      expectedUpdatedAt: disabled.updatedAt.toISOString(),
      idempotencyKey: "mass-remove:" + suffix,
      reason: "Isolated controlled mass removal",
      actor: { id: ids.admin, sessionVersion: 0 },
    });
    assert.equal(queued.queued >= 1, true);
    assert.equal(await prisma.telegramSyncJob.count({
      where: {
        channelId: disabled.id,
        membershipId: accountMembership.id,
        type: "reconcile_membership",
        dedupeKey: { startsWith: "mass-remove:" },
      },
    }), 1);
    assert.equal((await prisma.telegramMembership.findUniqueOrThrow({
      where: { id: accountMembership.id },
    })).status, "removal_pending");
    assert.equal(await prisma.telegramAuditEvent.count({
      where: { channelId: disabled.id, eventType: "mass_removal_queued" },
    }), 1);
    await assert.rejects(management.disconnectTelegramChannel({
      channelId: disabled.id,
      expectedUpdatedAt: disabled.updatedAt.toISOString(),
      idempotencyKey: "disconnect-blocked:" + suffix,
      reason: "Must remain blocked with memberships",
      actor: { id: ids.admin, sessionVersion: 0 },
    }), /telegram_memberships_must_be_removed/);
  });

  await check("expired one-time link cleanup is bounded and audited", async () => {
    const token = await prisma.telegramLinkToken.create({
      data: {
        tokenHash: createHash("sha256").update("expired-" + suffix).digest("hex"),
        purpose: "student_link",
        state: "pending",
        activeKey: "expired-test:" + suffix,
        subjectId: ids.accountCodeSubject,
        channelId: channels.account.id,
        userId: ids.codeStudent,
        userSessionVersion: 0,
        createdAt: new Date(Date.now() - 20 * 60_000),
        expiresAt: new Date(Date.now() - 10 * 60_000),
      },
    });
    const result = await links.expireTelegramLinkTokens(10);
    assert.equal(result.expired >= 1, true);
    assert.equal((await prisma.telegramLinkToken.findUniqueOrThrow({
      where: { id: token.id },
    })).state, "expired");
    assert.equal(await prisma.telegramAuditEvent.count({
      where: { linkTokenId: token.id, eventType: "link_token_expired" },
    }), 1);
  });
  await check("database rejects cross-principal guest membership", async () => {
    await assert.rejects(prisma.telegramMembership.create({
      data: {
        channelId: channels.guest.id,
        principalType: "guest_grant",
        codeAccessGrantId: accountActivation.grant.id,
        telegramUserId: telegramIds.invalid,
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

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";

const rawUrl = process.env.CODE_ACCESS_TEST_DATABASE_URL;
assert.ok(rawUrl, "CODE_ACCESS_TEST_DATABASE_URL is required");
const url = new URL(rawUrl);
assert.ok(url.hostname.endsWith(".neon.tech"), "The code-access suite requires an isolated Neon database");
assert.equal(process.env.CODE_ACCESS_TEST_ISOLATED, "true", "Explicit isolated-database confirmation is required");

const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
const suffix = randomUUID().slice(0, 8);
const ids = {
  admin: randomUUID(), student: randomUUID(), otherStudent: randomUUID(), university: randomUUID(),
  major: randomUUID(), subject: randomUUID(), otherSubject: randomUUID(), plan: randomUUID(),
};
const adminIdentity = { id: ids.admin, sessionVersion: 0 };
const studentIdentity = { id: ids.student, sessionVersion: 0 };

function load(client = prisma, currentUser = null) {
  return moduleLoader({
    "@/lib/prisma": { prisma: client },
    "@/lib/auth-helpers": { getCurrentUser: async () => currentUser },
    "next/cache": { unstable_cache: (fn) => fn },
  });
}

function rawCode() { return `QB-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`; }
function supportReference() { return `AC-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase().replace(/[01]/g, "2")}`; }
async function createCode(overrides = {}) {
  const plainCode = rawCode();
  const helpers = load()("src/lib/server/subscription-code.ts");
  const code = await prisma.subscriptionCode.create({ data: {
    planId: ids.plan,
    codeHash: helpers.hashSubscriptionCode(plainCode),
    codePreview: helpers.codePreviewFromPlainCode(plainCode),
    supportReference: supportReference(),
    durationDays: 7,
    maxUses: 1,
    maxBrowserSessions: 1,
    ...overrides,
  } });
  return { code, plainCode };
}

function activation(service, code, principal, overrides = {}) {
  return service.activateCodeAccess({
    code, subjectId: ids.subject, idempotencyKey: randomUUID(), principal, ...overrides,
  });
}

let passed = 0;
async function check(name, work) {
  await work();
  passed += 1;
  console.log(`PASS code-access ${passed}: ${name}`);
}

try {
  process.env.PAYMENT_CODES_ENABLED = "true";
  process.env.PAYMENT_LAUNCH_PLAN_IDS = "[]";
  process.env.PAYMENT_CODE_PLAN_IDS = "retired-and-ignored";

  await prisma.user.createMany({ data: [
    { id: ids.admin, email: `admin-${suffix}@example.test`, normalizedEmail: `admin-${suffix}@example.test`, password: "isolated-test-password-hash", role: "admin", isActive: true },
    { id: ids.student, email: `student-${suffix}@example.test`, normalizedEmail: `student-${suffix}@example.test`, role: "student", isActive: true, emailVerified: new Date() },
    { id: ids.otherStudent, email: `other-${suffix}@example.test`, normalizedEmail: `other-${suffix}@example.test`, role: "student", isActive: true, emailVerified: new Date() },
  ] });
  await prisma.university.create({ data: { id: ids.university, name: `Code access ${suffix}`, code: `CA-${suffix}`, countryCode: "SA", institutionType: "university" } });
  await prisma.major.create({ data: { id: ids.major, universityId: ids.university, name: `Major ${suffix}`, code: `M-${suffix}` } });
  await prisma.subject.createMany({ data: [
    { id: ids.subject, majorId: ids.major, name: `Subject ${suffix}`, code: `S-${suffix}` },
    { id: ids.otherSubject, majorId: ids.major, name: `Other ${suffix}`, code: `O-${suffix}` },
  ] });
  await prisma.paidAccessPlan.create({ data: {
    id: ids.plan, scopeType: "subject", subjectId: ids.subject, title: `Plan ${suffix}`, isActive: true,
    activationCodesEnabled: true, price: "1", currency: "SAR", defaultDurationDays: 7, defaultMaxUses: 1,
  } });

  const firstService = load(prisma)("src/lib/server/code-access.ts");
  const secondService = load(second)("src/lib/server/code-access.ts");

  await check("concurrent account activation creates one finite grant and one immutable activation event", async () => {
    const issued = await createCode();
    const principal = { type: "account", user: studentIdentity };
    const results = await Promise.all([
      activation(firstService, issued.plainCode, principal),
      activation(secondService, issued.plainCode, principal),
    ]);
    assert.equal(new Set(results.map((row) => row.grant.id)).size, 1);
    assert.equal(results.filter((row) => !row.alreadyActive).length, 1);
    assert.equal(results[0].grant.expiresAt.getTime() - results[0].grant.startsAt.getTime(), 7 * 86_400_000);
    assert.equal(await prisma.codeAccessGrant.count({ where: { codeId: issued.code.id } }), 1);
    const event = await prisma.codeAccessEvent.findFirstOrThrow({ where: { codeId: issued.code.id, type: "activated" } });
    assert.equal(await prisma.codeAccessEvent.count({ where: { codeId: issued.code.id, type: "activated" } }), 1);
    await assert.rejects(prisma.codeAccessEvent.update({ where: { id: event.id }, data: { metadata: { changed: true } } }));
    await assert.rejects(prisma.codeAccessEvent.delete({ where: { id: event.id } }));
    await firstService.revokeCodeAccessGrant({ grantId: results[0].grant.id, idempotencyKey: randomUUID(),
      reason: "Isolate the next PostgreSQL acceptance group", actor: adminIdentity });
  });

  await check("account-bound grants reject another account and do not renew on re-entry", async () => {
    const issued = await createCode();
    const first = await activation(firstService, issued.plainCode, { type: "account", user: studentIdentity });
    const repeat = await activation(firstService, issued.plainCode, { type: "account", user: studentIdentity });
    assert.equal(repeat.alreadyActive, true);
    assert.equal(repeat.grant.expiresAt.getTime(), first.grant.expiresAt.getTime());
    await assert.rejects(activation(firstService, issued.plainCode, { type: "account", user: { id: ids.otherStudent, sessionVersion: 0 } }), /code_used/);
    await firstService.revokeCodeAccessGrant({ grantId: first.grant.id, idempotencyKey: randomUUID(),
      reason: "Isolate the next PostgreSQL acceptance group", actor: adminIdentity });
  });

  await check("guest activation stores only a token hash and audited browser-limit changes gate recovery", async () => {
    const issued = await createCode();
    const first = await activation(firstService, issued.plainCode, { type: "guest" });
    assert.ok(first.guestSessionToken);
    const stored = await prisma.guestAccessSession.findFirstOrThrow({ where: { bindings: { some: { grantId: first.grant.id } } } });
    assert.notEqual(stored.tokenHash, first.guestSessionToken);
    await assert.rejects(activation(firstService, issued.plainCode, { type: "guest" }, { operation: "recover" }), /browser_limit_reached/);
    const limitKey = randomUUID();
    await firstService.changeCodeBrowserLimit({ codeId: issued.code.id, maxBrowserSessions: 2,
      idempotencyKey: limitKey, reason: "Increase isolated test browser limit", actor: adminIdentity });
    assert.equal((await firstService.changeCodeBrowserLimit({ codeId: issued.code.id, maxBrowserSessions: 2,
      idempotencyKey: limitKey, reason: "Increase isolated test browser limit", actor: adminIdentity })).alreadyChanged, true);
    const recovered = await activation(firstService, issued.plainCode, { type: "guest" }, { operation: "recover" });
    assert.ok(recovered.guestSessionToken);
    assert.equal(await prisma.codeAccessSessionBinding.count({ where: { grantId: first.grant.id, revokedAt: null } }), 2);
    assert.equal(await prisma.codeAccessEvent.count({ where: { grantId: first.grant.id, type: "browser_limit_changed" } }), 1);
    await assert.rejects(firstService.changeCodeBrowserLimit({ codeId: issued.code.id, maxBrowserSessions: 1,
      idempotencyKey: randomUUID(), reason: "Invalid isolated test reduction", actor: adminIdentity }), /browser_limit_below_active_sessions/);
    const bindings = await prisma.codeAccessSessionBinding.findMany({ where: { grantId: first.grant.id, revokedAt: null }, orderBy: { boundAt: "asc" } });
    const revokeKey = randomUUID();
    await firstService.revokeCodeAccessSession({ bindingId: bindings[0].id, idempotencyKey: revokeKey,
      reason: "Revoke one isolated browser binding", actor: adminIdentity });
    assert.equal((await firstService.revokeCodeAccessSession({ bindingId: bindings[0].id, idempotencyKey: revokeKey,
      reason: "Revoke one isolated browser binding", actor: adminIdentity })).alreadyRevoked, true);
    assert.equal((await prisma.guestAccessSession.findUniqueOrThrow({ where: { id: bindings[0].sessionId } })).revokedAt, null);
    assert.equal(await prisma.codeAccessSessionBinding.count({ where: { grantId: first.grant.id, revokedAt: null } }), 1);
    assert.equal(await prisma.codeAccessEvent.count({ where: { grantId: first.grant.id, type: "session_revoked" } }), 1);
    await firstService.changeCodeBrowserLimit({ codeId: issued.code.id, maxBrowserSessions: 1,
      idempotencyKey: randomUUID(), reason: "Reduce limit after explicit session revocation", actor: adminIdentity });
  });

  await check("concurrent self-service transfer permits one winner and enforces the cooldown", async () => {
    const issued = await createCode();
    await activation(firstService, issued.plainCode, { type: "guest" });
    const attempts = await Promise.allSettled([
      activation(firstService, issued.plainCode, { type: "guest" }, { operation: "transfer" }),
      activation(secondService, issued.plainCode, { type: "guest" }, { operation: "transfer" }),
    ]);
    const failureMessages = attempts.filter((row) => row.status === "rejected").map((row) => row.reason?.message);
    assert.equal(attempts.filter((row) => row.status === "fulfilled").length, 1, JSON.stringify(failureMessages));
    assert.equal(attempts.filter((row) => row.status === "rejected").length, 1);
    assert.match(attempts.find((row) => row.status === "rejected").reason.message, /transfer_too_soon/);
    assert.deepEqual(firstService.codeAccessTransferPolicy, {
      firstTransferImmediate: true, minimumIntervalMinutes: 10, maximumTransfers: 3, windowHours: 24,
    });
  });

  await check("scope, active-access, plan eligibility and release controls fail closed without consuming a code", async () => {
    const issued = await createCode();
    await assert.rejects(firstService.activateCodeAccess({ code: issued.plainCode, subjectId: ids.otherSubject,
      idempotencyKey: randomUUID(), principal: { type: "account", user: studentIdentity } }), /payment_target_mismatch/);
    await prisma.accessEntitlement.create({ data: { userId: ids.otherStudent, subjectId: ids.subject, scopeType: "subject",
      startsAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 86_400_000) } });
    await assert.rejects(activation(firstService, issued.plainCode, { type: "account", user: { id: ids.otherStudent, sessionVersion: 0 } }), /active_entitlement_exists/);
    assert.equal(await prisma.codeAccessGrant.count({ where: { codeId: issued.code.id } }), 0);
    await prisma.paidAccessPlan.update({ where: { id: ids.plan }, data: { activationCodesEnabled: false } });
    await assert.rejects(activation(firstService, issued.plainCode, { type: "guest" }), /code_plan_not_enabled/);
    await prisma.paidAccessPlan.update({ where: { id: ids.plan }, data: { activationCodesEnabled: true } });
    process.env.PAYMENT_CODE_PLAN_IDS = "[]";
    const noAllowlist = await activation(firstService, issued.plainCode, { type: "guest" });
    assert.equal(noAllowlist.outcome, "activated");
    await firstService.revokeCodeAccessGrant({ grantId: noAllowlist.grant.id, idempotencyKey: randomUUID(),
      reason: "Prove retired allowlist has no runtime effect", actor: adminIdentity });
  });

  await check("disable preserves access while audited enable restores operations without changing the grant", async () => {
    const issued = await createCode({ maxBrowserSessions: 2 });
    const activated = await activation(firstService, issued.plainCode, { type: "guest" });
    const beforeGrant = await prisma.codeAccessGrant.findUniqueOrThrow({ where: { id: activated.grant.id } });
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { id: ids.admin } });
    const firstAdmin = load(prisma, adminUser)("src/lib/server/payment-admin.ts");
    const secondAdmin = load(second, adminUser)("src/lib/server/payment-admin.ts");
    const activeCode = await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.code.id } });
    await firstAdmin.disablePaymentCode(issued.code.id, {
      reason: "Temporarily disable isolated code", expectedUpdatedAt: activeCode.updatedAt.toISOString(), confirmContentChange: false,
    });
    const guestAccess = load(prisma)("src/lib/server/access-control.ts");
    assert.equal((await guestAccess.checkScopeAccess({ subjectId: ids.subject, guestSessionToken: activated.guestSessionToken })).allowed, true);
    await assert.rejects(activation(firstService, issued.plainCode, { type: "guest" }, { operation: "recover" }), /inactive_code/);

    const disabled = await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.code.id } });
    const enableInput = {
      reason: "Restore the temporarily disabled isolated code",
      expectedUpdatedAt: disabled.updatedAt.toISOString(),
      confirmContentChange: true,
    };
    const enabled = await Promise.all([
      firstAdmin.enablePaymentCode(issued.code.id, enableInput),
      secondAdmin.enablePaymentCode(issued.code.id, enableInput),
    ]);
    assert.equal(enabled.filter((row) => !row.alreadyEnabled).length, 1);
    assert.equal(await prisma.paymentAdminEvent.count({ where: { codeId: issued.code.id, action: "code_enabled" } }), 1);
    const afterGrant = await prisma.codeAccessGrant.findUniqueOrThrow({ where: { id: activated.grant.id } });
    assert.equal(afterGrant.startsAt.getTime(), beforeGrant.startsAt.getTime());
    assert.equal(afterGrant.expiresAt.getTime(), beforeGrant.expiresAt.getTime());
    assert.equal(await prisma.codeAccessGrant.count({ where: { codeId: issued.code.id } }), 1);
    assert.equal((await activation(firstService, issued.plainCode, { type: "guest" }, { operation: "recover" })).outcome, "recovered");

    const reenabled = await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.code.id } });
    await firstAdmin.disablePaymentCode(issued.code.id, {
      reason: "Disable before revoking isolated grant", expectedUpdatedAt: reenabled.updatedAt.toISOString(), confirmContentChange: false,
    });
    await firstService.revokeCodeAccessGrant({ grantId: activated.grant.id, idempotencyKey: randomUUID(),
      reason: "Revoke isolated grant before rejected enable", actor: adminIdentity });
    const disabledAfterRevoke = await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: issued.code.id } });
    await assert.rejects(firstAdmin.enablePaymentCode(issued.code.id, {
      reason: "This enable must be rejected after grant revocation",
      expectedUpdatedAt: disabledAfterRevoke.updatedAt.toISOString(), confirmContentChange: true,
    }), /code_grant_not_reactivatable/);
    await assert.rejects(prisma.subscriptionCode.update({ where: { id: issued.code.id }, data: { isActive: true } }));
  });

  await check("disabled commerce and global code closure preserve existing grants while new activation stays closed", async () => {
    const issued = await createCode();
    const blocked = await createCode();
    const activated = await activation(firstService, issued.plainCode, { type: "account", user: studentIdentity });
    await prisma.paidAccessPlan.update({ where: { id: ids.plan }, data: { isActive: false } });
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: ids.student } });
    const access = load(prisma, currentUser)("src/lib/server/access-control.ts");
    const inactivePlanAccess = await access.checkScopeAccess({ subjectId: ids.subject });
    assert.equal(inactivePlanAccess.allowed, true); assert.equal(inactivePlanAccess.codeGrantId, activated.grant.id);
    await assert.rejects(activation(firstService, blocked.plainCode, { type: "guest" }), /inactive_plan/);
    await prisma.paidAccessPlan.update({ where: { id: ids.plan }, data: { isActive: true } });
    process.env.PAYMENT_CODES_ENABLED = "false";
    await assert.rejects(activation(firstService, blocked.plainCode, { type: "guest" }), /payment_codes_unavailable/);
    assert.equal((await access.checkScopeAccess({ subjectId: ids.subject })).allowed, true);
    process.env.PAYMENT_CODES_ENABLED = "true";
    await firstService.revokeCodeAccessGrant({ grantId: activated.grant.id, idempotencyKey: randomUUID(),
      reason: "Isolate the remaining PostgreSQL acceptance groups", actor: adminIdentity });
  });

  await check("grant revocation is immediate, immutable and audited", async () => {
    const issued = await createCode();
    const activated = await activation(firstService, issued.plainCode, { type: "guest" });
    await firstService.revokeCodeAccessGrant({ grantId: activated.grant.id, idempotencyKey: randomUUID(),
      reason: "Revoke isolated test code grant", actor: adminIdentity });
    const grant = await prisma.codeAccessGrant.findUniqueOrThrow({ where: { id: activated.grant.id } });
    assert.equal(grant.isActive, false); assert.ok(grant.revokedAt);
    assert.equal(await prisma.codeAccessEvent.count({ where: { grantId: grant.id, type: "grant_revoked" } }), 1);
    await assert.rejects(prisma.codeAccessGrant.delete({ where: { id: grant.id } }));
  });

  await check("database rejects unaudited grants, duplicate grants, browser overflow and reused historical audits", async () => {
    const issued = await createCode();
    await assert.rejects(prisma.codeAccessGrant.create({ data: { codeId: issued.code.id, planId: ids.plan,
      subjectId: ids.subject, principalType: "account", userId: ids.student, startsAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } }));
    assert.equal(await prisma.codeAccessGrant.count({ where: { codeId: issued.code.id } }), 0);

    const accountCode = await createCode();
    const accountGrant = await activation(firstService, accountCode.plainCode, { type: "account", user: studentIdentity });
    await firstService.changeCodeBrowserLimit({ codeId: accountCode.code.id, maxBrowserSessions: 2,
      idempotencyKey: randomUUID(), reason: "Create the first audited limit transition", actor: adminIdentity });
    await firstService.changeCodeBrowserLimit({ codeId: accountCode.code.id, maxBrowserSessions: 1,
      idempotencyKey: randomUUID(), reason: "Restore the isolated browser limit", actor: adminIdentity });
    await assert.rejects(prisma.subscriptionCode.update({
      where: { id: accountCode.code.id }, data: { maxBrowserSessions: 2 },
    }));
    assert.equal((await prisma.subscriptionCode.findUniqueOrThrow({ where: { id: accountCode.code.id } })).maxBrowserSessions, 1);
    await firstService.revokeCodeAccessGrant({ grantId: accountGrant.grant.id, idempotencyKey: randomUUID(),
      reason: "Complete historical audit isolation", actor: adminIdentity });

    const guestCode = await createCode();
    const guestGrant = await activation(firstService, guestCode.plainCode, { type: "guest" });
    const overflowSession = await prisma.guestAccessSession.create({ data: {
      tokenHash: randomUUID().replaceAll("-", "").repeat(2),
      expiresAt: guestGrant.grant.expiresAt,
    } });
    await assert.rejects(prisma.codeAccessSessionBinding.create({ data: {
      grantId: guestGrant.grant.id, sessionId: overflowSession.id,
    } }));
    assert.equal(await prisma.codeAccessSessionBinding.count({
      where: { grantId: guestGrant.grant.id, revokedAt: null },
    }), 1);

    await assert.rejects(prisma.codeAccessGrant.create({ data: {
      codeId: guestCode.code.id, planId: ids.plan, subjectId: ids.subject,
      principalType: "guest", startsAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
    } }));
    assert.equal(await prisma.codeAccessGrant.count({ where: { codeId: guestCode.code.id } }), 1);
  });

  console.log(`${passed} Code Access PostgreSQL acceptance groups passed`);
} finally {
  await prisma.$disconnect();
  await second.$disconnect();
}

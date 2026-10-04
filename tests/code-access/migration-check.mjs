import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const mode = process.argv[2];
assert.ok(["seed-upgrade", "verify-upgrade", "verify-clean"].includes(mode), "migration-check mode is required");
const rawUrl = process.env.MIGRATION_TEST_DATABASE_URL;
assert.ok(rawUrl, "MIGRATION_TEST_DATABASE_URL is required");
const url = new URL(rawUrl);
assert.ok(url.hostname.endsWith(".neon.tech"), "An isolated Neon database is required");
assert.equal(process.env.CODE_ACCESS_TEST_ISOLATED, "true", "Explicit isolated-database confirmation is required");

const prisma = new PrismaClient({ datasourceUrl: url.href });
const id = (value) => `91000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const f = { user: id(1), university: id(2), major: id(3), subject: id(4), plan: id(5), code: id(6), entitlement: id(7) };

try {
  if (mode === "seed-upgrade") {
    const now = new Date();
    await prisma.$executeRaw`INSERT INTO users (id,email,"normalizedEmail",role,"isActive","emailVerified","createdAt","sessionVersion")
      VALUES (${f.user},'expand-upgrade@example.test','expand-upgrade@example.test','student',true,${now},${now},0)`;
    await prisma.$executeRaw`INSERT INTO universities (id,name,code,"countryCode","institutionType",visibility,"isActive","createdAt","updatedAt")
      VALUES (${f.university},'Expand upgrade university','EXP-UP','SA','university','country',true,${now},${now})`;
    await prisma.$executeRaw`INSERT INTO majors (id,"universityId",name,code,"isActive","createdAt","updatedAt")
      VALUES (${f.major},${f.university},'Expand upgrade major','EXP-M',true,${now},${now})`;
    await prisma.$executeRaw`INSERT INTO subjects (id,"majorId",name,code,"isActive","createdAt","updatedAt")
      VALUES (${f.subject},${f.major},'Expand upgrade subject','EXP-S',true,${now},${now})`;
    await prisma.$executeRaw`INSERT INTO paid_access_plans (id,"scopeType","subjectId",title,"isActive",price,currency,"defaultDurationDays","defaultMaxUses","createdAt","updatedAt")
      VALUES (${f.plan},'subject',${f.subject},'Expand upgrade plan',true,1,'SAR',7,1,${now},${now})`;
    await prisma.$executeRaw`INSERT INTO subscription_codes (id,"planId","codeHash","codePreview","durationDays","maxUses","usedCount","isActive","createdAt","updatedAt")
      VALUES (${f.code},${f.plan},${createHash("sha256").update("EXPANDUPGRADECODE").digest("hex")},'EXP...CODE',7,1,0,true,${now},${now})`;
    await prisma.$executeRaw`INSERT INTO access_entitlements (id,"userId","scopeType","subjectId","startsAt","expiresAt","isActive","createdAt","updatedAt")
      VALUES (${f.entitlement},${f.user},'subject',${f.subject},${now},${new Date(now.getTime() + 86_400_000)},true,${now},${now})`;
    console.log(JSON.stringify({ seeded: true, users: 1, majors: 1, subjects: 1, plans: 1, codes: 1, entitlements: 1 }));
  } else if (mode === "verify-upgrade") {
    const [user, major, subject, plan, code, entitlement, grants, sessions, events] = await Promise.all([
      prisma.user.count({ where: { id: f.user } }), prisma.major.count({ where: { id: f.major } }),
      prisma.subject.count({ where: { id: f.subject } }), prisma.paidAccessPlan.findUniqueOrThrow({ where: { id: f.plan } }),
      prisma.subscriptionCode.findUniqueOrThrow({ where: { id: f.code } }), prisma.accessEntitlement.count({ where: { id: f.entitlement } }),
      prisma.codeAccessGrant.count(), prisma.guestAccessSession.count(), prisma.codeAccessEvent.count(),
    ]);
    assert.deepEqual([user, major, subject, entitlement], [1, 1, 1, 1]);
    assert.equal(plan.activationCodesEnabled, false);
    assert.equal(code.supportReference, null); assert.equal(code.maxBrowserSessions, 1);
    assert.deepEqual([grants, sessions, events], [0, 0, 0]);
    console.log(JSON.stringify({ verified: true, existingRowsPreserved: true, defaults: true, newTablesEmpty: true }));
  } else {
    const [migrations, grants, sessions, bindings, events] = await Promise.all([
      prisma.$queryRaw`SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      prisma.codeAccessGrant.count(), prisma.guestAccessSession.count(), prisma.codeAccessSessionBinding.count(), prisma.codeAccessEvent.count(),
    ]);
    assert.equal(migrations[0].count, 36);
    assert.deepEqual([grants, sessions, bindings, events], [0, 0, 0, 0]);
    console.log(JSON.stringify({ verified: true, migrations: 36, newTablesEmpty: true }));
  }
} finally {
  await prisma.$disconnect();
}

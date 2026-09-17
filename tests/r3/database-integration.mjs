import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { moduleLoader } from "../admin/load-module.mjs";
import { f } from "../payments/fixtures.mjs";

const url = new URL(process.env.P2_TEST_DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
const origin = process.env.NEXTAUTH_URL;
let count = 0;
async function check(name, work) { await work(); console.log(`PASS R3 ${++count}: ${name}`); }

try {
  await check("legacy payment tables and anonymous payment columns are absent while anonymous quiz tracking remains", async () => {
    const [manualTable, columns] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT to_regclass('public.manual_payment_requests')::text AS name`),
      prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('access_entitlements', 'subscription_codes') AND column_name IN ('anonymousSessionId', 'majorId', 'paymentVersion')`),
    ]);
    assert.equal(manualTable[0].name, null);
    assert.deepEqual(columns, []);
    const session = await prisma.anonymousSession.create({ data: { sessionToken: `r3-${randomUUID()}`, expiresAt: new Date(Date.now() + 3600000) } });
    const attempt = await prisma.quizAttempt.create({ data: { sessionId: session.id, quizId: f.free, totalQuestions: 1 } });
    assert.equal(attempt.sessionId, session.id);
  });

  await check("an order-backed entitlement may be granted without a redemption code", async () => {
    const entitlement = await prisma.accessEntitlement.create({ data: {
      userId: f.bob, scopeType: "subject", subjectId: f.sa,
    } });
    assert.equal(entitlement.userId, f.bob);
    assert.equal(entitlement.codeId, null);
  });

  await check("a paid SA summary cannot receive a public or non-R2 PDF", async () => {
    const publicPdf = await prisma.attachment.create({ data: {
      ownerType: "study_summary", ownerId: f.saSummary, kind: "pdf", storageProvider: "external_url", visibility: "public",
      url: "https://example.test/legacy-paid.pdf", contentType: "application/pdf",
    } });
    await assert.rejects(prisma.studySummary.update({ where: { id: f.saSummary }, data: { pdfAttachmentId: publicPdf.id } }), /payment_private_media_required/);
    const current = await prisma.studySummary.findUniqueOrThrow({ where: { id: f.saSummary } });
    assert.notEqual(current.pdfAttachmentId, publicPdf.id);
    await assert.rejects(prisma.attachment.update({ where: { id: current.pdfAttachmentId }, data: { visibility: "public" } }), /payment_private_media_required/);
  });

  await check("activating a plan rejects inherited summaries with public binaries or embedded media links", async () => {
    const mediaUniversityId = `r3-media-university-${randomUUID()}`;
    const mediaMajorId = `r3-media-major-${randomUUID()}`;
    const mediaSubjectId = `r3-media-subject-${randomUUID()}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO universities (id, name, "countryCode", "institutionType", "isActive", "updatedAt") VALUES ($1, $2, 'SA', 'university', true, now())`,
      mediaUniversityId, "R3 media university",
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO majors (id, "universityId", name, "updatedAt") VALUES ($1, $2, $3, now())`,
      mediaMajorId, mediaUniversityId, "R3 media major",
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO subjects (id, "majorId", name, "updatedAt") VALUES ($1, $2, $3, now())`,
      mediaSubjectId, mediaMajorId, "R3 media subject",
    );
    const pdf = await prisma.attachment.create({ data: {
      ownerType: "study_summary", ownerId: "r3-inherited-pdf", kind: "pdf", storageProvider: "external_url", visibility: "public",
      url: "https://example.test/direct.pdf", contentType: "application/pdf",
    } });
    const inheritedPdf = await prisma.studySummary.create({ data: {
      id: "r3-inherited-pdf", subjectId: mediaSubjectId, title: "R3 inherited PDF", slug: "r3-inherited-pdf", accessType: "inherit",
      status: "draft", pdfAttachmentId: pdf.id,
    } });
    await assert.rejects(prisma.paidAccessPlan.create({ data: {
      id: "r3-inherited-plan", title: "R3 inherited plan", scopeType: "subject", subjectId: mediaSubjectId, price: "10",
    } }), /payment_private_media_required/);
    await prisma.studySummary.delete({ where: { id: inheritedPdf.id } });

    const inheritedLink = await prisma.studySummary.create({ data: {
      id: "r3-inherited-link", subjectId: mediaSubjectId, title: "R3 inherited link", slug: "r3-inherited-link", accessType: "inherit",
      status: "draft", contentHtml: '<a href="https://example.test/private-not.pdf">read</a><a href="https://example.test/paid.pdf">download</a>',
    } });
    await assert.rejects(prisma.paidAccessPlan.create({ data: {
      id: "r3-inherited-link-plan", title: "R3 inherited link plan", scopeType: "subject", subjectId: mediaSubjectId, price: "10",
    } }), /payment_private_media_required/);
    await prisma.studySummary.delete({ where: { id: inheritedLink.id } });
  });

  await check("the server-side media policy matches the database guard and does not restrict free or out-of-scope content", async () => {
    const media = moduleLoader({ "@/lib/prisma": { prisma } })("src/lib/server/payment-media.ts");
    assert.equal(media.hasDirectPublicMediaReference("<a href='/uploads/attachments/a.pdf'>x</a>"), true);
    assert.equal(media.hasDirectPublicMediaReference("https://example.test/article"), false);
    assert.equal(await media.getPaymentSummaryMediaIssue({ subjectId: f.sa, accessType: "paid", pdfAttachmentId: null, contentHtml: "https://example.test/a.pdf", contentText: null }), "paid_summary_public_media_reference");
    assert.equal(await media.getPaymentSummaryMediaIssue({ subjectId: f.ye, accessType: "paid", pdfAttachmentId: null, contentHtml: "https://example.test/a.pdf", contentText: null }), null);
    const freePdf = await prisma.attachment.create({ data: {
      ownerType: "study_summary", ownerId: "r3-free", kind: "pdf", storageProvider: "external_url", visibility: "public",
      url: "https://example.test/free.pdf", contentType: "application/pdf",
    } });
    const free = await prisma.studySummary.create({ data: {
      id: "r3-free", subjectId: f.sa, title: "R3 free", slug: "r3-free", accessType: "free", status: "draft", pdfAttachmentId: freePdf.id,
    } });
    assert.equal(free.pdfAttachmentId, freePdf.id);
  });

  await check("the retired endpoint is private and never becomes a payment write path", async () => {
    const route = moduleLoader()("src/app/api/v1/student/access/payment-request/route.ts");
    const response = await route.POST(new Request(`${origin}/api/v1/student/access/payment-request`, { method: "POST" }));
    assert.equal(response.status, 410);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  });
  console.log(`${count} R3 PostgreSQL/service acceptance groups passed`);
} finally {
  await prisma.$disconnect();
}

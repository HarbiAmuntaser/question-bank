import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
export const id = (n) => `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const f = {
  sa: id(1), ye: id(2), academy: id(3), hidden: id(4), sa2: id(5),
  paid: id(101), free: id(102), preview: id(103), inherited: id(104),
  yeQuiz: id(105), academyQuiz: id(106), mixed: id(107), hiddenQuiz: id(108),
  fallback: id(109), missing: id(110),
  saSummary: id(201), yeSummary: id(202), academySummary: id(203), draft: id(204), future: id(205),
  plan: id(301), yePlan: id(302), academyPlan: id(303), majorPlan: id(304),
  anonymous: id(401), legacyCode: id(402), legacyEntitlement: id(403), legacyRequest: id(404),
  alice: id(501), bob: id(502), unverified: id(503),
};
export const password = "A payment student test phrase";

export async function seedPaymentFixtures(client) {
  const hash = await bcrypt.hash(password, 12);
  for (const [userId, name, verified] of [[f.alice, "alice", true], [f.bob, "bob", true], [f.unverified, "unverified", false]]) {
    await client.query(`INSERT INTO users (id,name,email,"normalizedEmail",password,role,"emailVerified") VALUES ($1,$2,$3,$3,$4,'student',$5)`, [userId, name, `${name}@p3.example.test`, hash, verified ? new Date() : null]);
  }
  for (const [subjectId, name, country, type, active] of [[f.sa, "SA university", "SA", "university", true], [f.ye, "YE university", "YE", "university", true],
    [f.academy, "SA academy", "SA", "academy", true], [f.hidden, "Hidden", "YE", "university", false], [f.sa2, "Other SA university", "SA", "university", true]]) {
    await client.query(`INSERT INTO universities (id,name,"countryCode","institutionType","isActive","updatedAt") VALUES ($1,$2,$3,$4,$5,now())`, [`u-${subjectId}`, name, country, type, active]);
    await client.query(`INSERT INTO majors (id,"universityId",name,"updatedAt") VALUES ($1,$2,$3,now())`, [`m-${subjectId}`, `u-${subjectId}`, name]);
    await client.query(`INSERT INTO subjects (id,"majorId",name,"updatedAt") VALUES ($1,$2,$3,now())`, [subjectId, `m-${subjectId}`, name]);
    await client.query(`INSERT INTO chapters (id,"subjectId",name,"learningObjectives","updatedAt") VALUES ($1,$2,$3,ARRAY[]::text[],now())`, [`ch-${subjectId}`, subjectId, name]);
    await client.query(`INSERT INTO questions (id,"chapterId","questionText",tags,"updatedAt") VALUES ($1,$2,$3,ARRAY[]::text[],now())`, [`q-${subjectId}`, `ch-${subjectId}`, `PROTECTED ${name}`]);
    await client.query(`INSERT INTO question_options (id,"questionId","optionText","isCorrect","optionOrder") VALUES ($1,$2,'Correct',true,1)`, [`opt-${subjectId}`, `q-${subjectId}`]);
  }
  for (const [quizId, subjectId, accessType, preview] of [[f.paid, f.sa, "paid", false], [f.free, f.sa, "free", false], [f.preview, f.sa, "paid", true],
    [f.inherited, f.sa, "inherit", false], [f.yeQuiz, f.ye, "paid", false], [f.academyQuiz, f.academy, "paid", false], [f.mixed, f.ye, "paid", false],
    [f.hiddenQuiz, f.hidden, "free", false], [f.fallback, null, "paid", false], [f.missing, null, "paid", false]]) {
    await client.query(`INSERT INTO quizzes (id,title,"subjectId","accessType","isFreePreview","totalQuestions","updatedAt") VALUES ($1,$2,$3,$4,$5,1,now())`, [quizId, `P3 ${quizId.slice(-3)}`, subjectId, accessType, preview]);
    if (quizId !== f.missing) await client.query(`INSERT INTO quiz_questions (id,"quizId","questionId","questionOrder") VALUES ($1,$2,$3,1)`, [`qq-${quizId}`, quizId, `q-${quizId === f.mixed || quizId === f.fallback ? f.sa : subjectId}`]);
  }
  for (const [summaryId, subjectId, status, publishedAt] of [[f.saSummary, f.sa, "published", new Date(0)], [f.yeSummary, f.ye, "published", new Date(0)],
    [f.academySummary, f.academy, "published", new Date(0)], [f.draft, f.ye, "draft", new Date(0)], [f.future, f.ye, "published", new Date("2099-01-01")]]) {
    await client.query(`INSERT INTO study_summaries (id,"subjectId",title,slug,"contentHtml",status,"publishedAt","accessType","updatedAt") VALUES ($1,$2,$3,$1,$4,$5,$6,'paid',now())`, [summaryId, subjectId, `P3 summary ${summaryId.slice(-3)}`, "<p>PROTECTED SUMMARY</p>", status, publishedAt]);
    await client.query(`INSERT INTO attachments (id,"ownerId","ownerType",kind,"storageProvider",visibility,url,"contentType","updatedAt") VALUES ($1,$2,'study_summary','pdf','external_url','public','https://example.test/test.pdf','application/pdf',now())`, [`pdf-${summaryId}`, summaryId]);
    await client.query(`UPDATE study_summaries SET "pdfAttachmentId"=$1 WHERE id=$2`, [`pdf-${summaryId}`, summaryId]);
  }
  for (const [planId, subjectId, scope] of [[f.plan, f.sa, "subject"], [f.yePlan, f.ye, "subject"], [f.academyPlan, f.academy, "subject"], [f.majorPlan, f.sa2, "major"]]) {
    await client.query(`INSERT INTO paid_access_plans (id,title,"scopeType","subjectId","majorId",price,"updatedAt") VALUES ($1,'Legacy plan',$2,$3,$4,25,now())`, [planId, scope, scope === "subject" ? subjectId : null, scope === "major" ? `m-${subjectId}` : null]);
  }
  await client.query(`INSERT INTO anonymous_sessions (id,"sessionToken","expiresAt") VALUES ($1,'p3-anonymous-token',now()+interval '1 day')`, [f.anonymous]);
  await client.query(`INSERT INTO subscription_codes (id,"planId","codeHash","usedCount","updatedAt") VALUES ($1,$2,$3,1,now())`, [f.legacyCode, f.plan, createHash("sha256").update("QBOLDCODE").digest("hex")]);
  await client.query(`INSERT INTO access_entitlements (id,"anonymousSessionId","codeId","scopeType","subjectId","updatedAt") VALUES ($1,$2,$3,'subject',$4,now())`, [f.legacyEntitlement, f.anonymous, f.legacyCode, f.sa]);
  await client.query(`INSERT INTO manual_payment_requests (id,"anonymousSessionId","planId","updatedAt") VALUES ($1,$2,$3,now())`, [f.legacyRequest, f.anonymous, f.plan]);
}

export async function verifyPaymentMigration(client) {
  const entitlement = (await client.query(`SELECT "userId","anonymousSessionId","isActive" FROM access_entitlements WHERE id=$1`, [f.legacyEntitlement])).rows[0];
  const code = (await client.query(`SELECT "paymentVersion","usedCount" FROM subscription_codes WHERE id=$1`, [f.legacyCode])).rows[0];
  const request = (await client.query(`SELECT "userId","subjectId","anonymousSessionId" FROM manual_payment_requests WHERE id=$1`, [f.legacyRequest])).rows[0];
  return { entitlement, code, request };
}

export async function verifyR3Cleanup(client) {
  const [legacyPlans, legacyCodes, legacyEntitlements, legacyTable, legacyColumns] = await Promise.all([
    client.query(`SELECT count(*)::int AS count FROM paid_access_plans p WHERE p."scopeType" <> 'subject' OR p."majorId" IS NOT NULL OR p."subjectId" IS NULL`),
    client.query(`SELECT count(*)::int AS count FROM subscription_codes WHERE id = $1`, [f.legacyCode]),
    client.query(`SELECT count(*)::int AS count FROM access_entitlements WHERE id = $1`, [f.legacyEntitlement]),
    client.query(`SELECT to_regclass('public.manual_payment_requests') AS name`),
    client.query(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('access_entitlements', 'subscription_codes') AND column_name IN ('anonymousSessionId', 'majorId', 'paymentVersion') ORDER BY column_name`),
  ]);
  return {
    legacyPlans: legacyPlans.rows[0].count,
    legacyCodes: legacyCodes.rows[0].count,
    legacyEntitlements: legacyEntitlements.rows[0].count,
    legacyTable: legacyTable.rows[0].name,
    legacyColumns: legacyColumns.rows.map((row) => row.column_name),
  };
}

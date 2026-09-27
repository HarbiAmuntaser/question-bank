import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const summaryId = "11111111-1111-4111-8111-111111111111";
const chapterId = "22222222-2222-4222-8222-222222222222";
const attachmentId = "33333333-3333-4333-8333-333333333333";

function privatePdf() {
  return {
    id: attachmentId,
    kind: "pdf",
    ownerType: "study_summary",
    ownerId: summaryId,
    storageProvider: "r2",
    visibility: "private",
    bucket: "private",
    storageKey: "summaries/reference.pdf",
    contentType: "application/pdf",
    url: null,
  };
}

function summary(overrides = {}) {
  return {
    id: summaryId,
    subjectId: "subject-a",
    chapterId,
    pdfAttachment: privatePdf(),
    ...overrides,
  };
}

test("Targeted review migration is additive, nullable and database constrained", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const sql = readFileSync(
    "prisma/migrations/20260927100000_targeted_quiz_review/migration.sql",
    "utf8",
  );

  assert.match(schema, /reviewSummaryId\s+String\?/);
  assert.match(schema, /reviewTopic\s+String\?\s+@db\.VarChar\(200\)/);
  assert.match(schema, /reviewPage\s+Int\?/);
  assert.match(schema, /onDelete: SetNull/);
  assert.match(sql, /CHECK \("reviewPage" IS NULL OR "reviewPage" >= 1\)/);
  assert.match(sql, /ON DELETE SET NULL/);
  assert.match(sql, /questions_reviewSummaryId_idx/);
  assert.doesNotMatch(sql, /(?:^|\n)\s*(?:UPDATE|DELETE FROM)\b|Quiz.*reviewSummary/i);
});

test("Central review target policy enforces the exact Chapter and usable PDF", async () => {
  const policy = moduleLoader({})("src/lib/server/question-review-target.ts");
  let summaryReads = 0;
  const db = {
    studySummary: {
      findUnique: async () => {
        summaryReads += 1;
        return summary();
      },
    },
    question: {
      findFirst: async () => null,
      count: async () => 2,
    },
  };

  assert.equal(
    (await policy.validateQuestionReviewTarget(db, {
      chapterId,
      reviewSummaryId: summaryId,
      reviewPage: 8,
    })).id,
    summaryId,
  );
  assert.equal(summaryReads, 1);

  await assert.rejects(
    policy.validateQuestionReviewTarget(db, {
      chapterId: "other-chapter",
      reviewSummaryId: summaryId,
      reviewPage: 8,
    }),
    (error) => error.code === "review_summary_chapter_mismatch",
  );

  db.studySummary.findUnique = async () => summary({ pdfAttachment: null });
  await assert.rejects(
    policy.validateQuestionReviewTarget(db, {
      chapterId,
      reviewSummaryId: summaryId,
      reviewPage: 8,
    }),
    (error) => error.code === "review_summary_pdf_required",
  );

  const readsBeforeEmpty = summaryReads;
  assert.equal(
    await policy.validateQuestionReviewTarget(db, {
      chapterId,
      reviewSummaryId: null,
      reviewPage: 8,
    }),
    null,
  );
  assert.equal(summaryReads, readsBeforeEmpty);
});

test("Moving a Summary cannot leave linked Questions in another Chapter", async () => {
  const policy = moduleLoader({})("src/lib/server/question-review-target.ts");
  const db = {
    studySummary: { findUnique: async () => null },
    question: {
      findFirst: async ({ where }) =>
        where.chapterId?.not === "next-chapter" ? { id: "question-a" } : null,
      count: async () => 3,
    },
  };

  await assert.rejects(
    policy.ensureSummaryChapterMoveIsSafe(db, {
      summaryId,
      nextChapterId: "next-chapter",
    }),
    (error) => error.code === "review_summary_has_incompatible_questions",
  );
  assert.equal(await policy.countSummaryReviewPageQuestions(db, summaryId), 3);
});

test("JSON parser remains backward compatible and accepts topic/page without Summary UUID", () => {
  const parser = moduleLoader({})(
    "src/components/admin/questions/import-questions-dialog/import-parser.ts",
  );
  const oldJson = JSON.stringify([
    {
      questionText: "Old question",
      questionType: "true_false",
      tfAnswer: true,
    },
  ]);
  const oldPreview = parser.buildPreview(oldJson);
  assert.equal(oldPreview.errors.length, 0);
  assert.equal(oldPreview.items[0].reviewTopic, null);
  assert.equal(oldPreview.items[0].reviewPage, null);

  const newJson = JSON.stringify([
    {
      questionText: "New question",
      questionType: "multiple_choice",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
      ],
      reviewTopic: "Client-Server Architecture",
      reviewPage: 8,
    },
  ]);
  const nextPreview = parser.buildPreview(newJson);
  assert.equal(nextPreview.errors.length, 0);
  assert.equal(nextPreview.items[0].reviewTopic, "Client-Server Architecture");
  assert.equal(nextPreview.items[0].reviewPage, 8);
  assert.equal("reviewSummaryId" in nextPreview.items[0], false);

  const invalid = parser.buildPreview(newJson.replace('"reviewPage":8', '"reviewPage":0'));
  assert.equal(invalid.errors.length, 1);
});

test("Each Final Quiz question resolves its own published Summary target", () => {
  const review = moduleLoader({})("src/lib/server/public-question-review.ts");
  const publishedAt = new Date("2026-09-01T00:00:00Z");
  const makeQuestion = (id, chapter, summaryKey) => ({
    id,
    chapterId: chapter,
    reviewSummaryId: summaryKey,
    reviewTopic: `Topic ${id}`,
    reviewPage: id === "q1" ? 8 : 12,
    reviewSummary: {
      id: summaryKey,
      title: `Summary ${id}`,
      slug: `summary-${id}`,
      status: "published",
      publishedAt,
      chapterId: chapter,
      pdfAttachmentId: attachmentId,
      subject: {
        id: `subject-${id}`,
        major: {
          id: `major-${id}`,
          university: {
            id: `university-${id}`,
            code: `UNI-${id}`,
            countryCode: "SA",
            institutionType: "university",
          },
        },
      },
    },
  });

  const first = review.publicQuestionReviewData(makeQuestion("q1", "chapter-1", "summary-1"));
  const second = review.publicQuestionReviewData(makeQuestion("q2", "chapter-2", "summary-2"));
  assert.equal(first.reviewSummary.id, "summary-1");
  assert.equal(first.reviewPage, 8);
  assert.equal(second.reviewSummary.id, "summary-2");
  assert.equal(second.reviewPage, 12);
  assert.notEqual(first.reviewSummary.href, second.reviewSummary.href);

  const unpublished = makeQuestion("q3", "chapter-3", "summary-3");
  unpublished.reviewSummary.status = "draft";
  assert.equal(review.publicQuestionReviewData(unpublished).reviewSummary, null);
});

function pdfRouteHarness({ allowed = true } = {}) {
  const state = { signedCalls: 0 };
  const prisma = {
    studySummary: {
      findUnique: async () => ({
        id: summaryId,
        status: "published",
        publishedAt: new Date("2026-09-01T00:00:00Z"),
        subjectId: "subject-a",
        chapterId,
        pdfAttachmentId: attachmentId,
        pdfAttachment: privatePdf(),
        subject: { majorId: "major-a" },
        chapter: { id: chapterId },
      }),
    },
  };
  const load = moduleLoader({
    "@/lib/prisma": { prisma },
    "@/lib/server/public-content-visibility": { isPublicStudySummaryId: async () => true },
    "@/lib/server/access-control": {
      checkStudySummaryAccess: async () => ({ allowed, effectiveAccessType: "paid" }),
    },
    "@/lib/server/storage": {
      createPresignedGetUrl: async () => {
        state.signedCalls += 1;
        return "https://signed.example/reference.pdf?signature=safe";
      },
    },
  });

  return {
    state,
    route: load("src/app/api/v1/student/summaries/[id]/pdf/route.ts"),
  };
}

test("PDF page redirect is best-effort and still access checked", async () => {
  const allowed = pdfRouteHarness();
  const response = await allowed.route.GET(
    new Request(`https://example.test/api/v1/student/summaries/${summaryId}/pdf?page=8`),
    { params: Promise.resolve({ id: summaryId }) },
  );
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://signed.example/reference.pdf?signature=safe#page=8",
  );
  assert.equal(allowed.state.signedCalls, 1);

  const denied = pdfRouteHarness({ allowed: false });
  const deniedResponse = await denied.route.GET(
    new Request(`https://example.test/api/v1/student/summaries/${summaryId}/pdf?page=8`),
    { params: Promise.resolve({ id: summaryId }) },
  );
  assert.equal(deniedResponse.status, 403);
  assert.equal(denied.state.signedCalls, 0);
});

test("Detailed target stays in Wrong Answers Review and PDF mutations are guarded", () => {
  const reviewUi = readFileSync("src/components/public/quiz/review/quiz-review.tsx", "utf8");
  const resultUi = readFileSync(
    "src/components/public/quiz/result/result-study-guidance.tsx",
    "utf8",
  );
  const summaryRoute = readFileSync(
    "src/app/api/v1/admin/summaries/[id]/route.ts",
    "utf8",
  );
  const attachmentRoute = readFileSync(
    "src/app/api/v1/admin/attachments/[id]/route.ts",
    "utf8",
  );

  assert.match(reviewUi, /!current!\.isCorrect \? <QuestionReviewGuidance/);
  assert.match(reviewUi, /reviewSummary/);
  assert.doesNotMatch(resultUi, /reviewSummaryId|reviewPage|QuestionReviewGuidance/);
  assert.match(summaryRoute, /summary_pdf_review_pages_require_acknowledgement/);
  assert.match(summaryRoute, /ensureSummaryChapterMoveIsSafe/);
  assert.match(attachmentRoute, /acknowledgeReviewPageImpact/);
});

test("Phase 2 remains outside Payment, SEO, College and Auth models", () => {
  const migration = readFileSync(
    "prisma/migrations/20260927100000_targeted_quiz_review/migration.sql",
    "utf8",
  );
  assert.doesNotMatch(
    migration,
    /payment|entitlement|subscription|college|seo|user_auth|password/i,
  );
});

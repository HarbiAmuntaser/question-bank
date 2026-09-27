import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

if (process.env.ALLOW_TARGETED_REVIEW_DB_TEST !== "true") {
  throw new Error("ALLOW_TARGETED_REVIEW_DB_TEST=true is required.");
}
if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  throw new Error("DATABASE_URL and DIRECT_URL are required.");
}
if (process.env.DATABASE_URL === process.env.PRODUCTION_DATABASE_URL) {
  throw new Error("Refusing to run against the declared Production database.");
}

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);

try {
  const [legacyQuestionCount, legacyReviewDataCount, chapterCount, theoryChapterCount] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({
      where: {
        OR: [
          { reviewSummaryId: { not: null } },
          { reviewTopic: { not: null } },
          { reviewPage: { not: null } },
        ],
      },
    }),
    prisma.chapter.count(),
    prisma.chapter.count({ where: { kind: "theory" } }),
  ]);

  assert.ok(legacyQuestionCount >= 0);
  assert.equal(legacyReviewDataCount, 0, "pre-existing Questions must remain NULL");
  assert.equal(theoryChapterCount, chapterCount, "pre-existing Chapters must default to theory");

  const university = await prisma.university.create({
    data: {
      name: `Targeted review test ${suffix}`,
      code: `TR-${suffix}`,
      countryCode: "YE",
      institutionType: "academy",
    },
  });
  const major = await prisma.major.create({
    data: { universityId: university.id, name: "Integration major", code: `M-${suffix}` },
  });
  const subject = await prisma.subject.create({
    data: { majorId: major.id, name: "Integration subject", code: `S-${suffix}` },
  });
  const chapters = await Promise.all([
    prisma.chapter.create({
      data: { subjectId: subject.id, name: "Chapter one", slug: `chapter-one-${suffix}`, chapterNumber: 1 },
    }),
    prisma.chapter.create({
      data: {
        subjectId: subject.id,
        name: "Chapter two",
        slug: `chapter-two-${suffix}`,
        chapterNumber: 2,
        kind: "practical",
      },
    }),
  ]);

  const summaryIds = [randomUUID(), randomUUID()];
  const attachments = await Promise.all(
    summaryIds.map((summaryId, index) =>
      prisma.attachment.create({
        data: {
          ownerType: "study_summary",
          ownerId: summaryId,
          kind: "pdf",
          storageProvider: "r2",
          visibility: "private",
          bucket: "isolated-test-private",
          storageKey: `targeted-review/${suffix}/summary-${index + 1}.pdf`,
          contentType: "application/pdf",
          originalName: `summary-${index + 1}.pdf`,
        },
      }),
    ),
  );

  const summaries = await Promise.all(
    summaryIds.map((id, index) =>
      prisma.studySummary.create({
        data: {
          id,
          subjectId: subject.id,
          chapterId: chapters[index].id,
          title: `Summary ${index + 1}`,
          slug: `summary-${index + 1}-${suffix}`,
          contentText: `Summary content ${index + 1}`,
          pdfAttachmentId: attachments[index].id,
          status: "published",
          publishedAt: new Date(),
        },
      }),
    ),
  );

  const questions = await Promise.all(
    chapters.map((chapter, index) =>
      prisma.question.create({
        data: {
          chapterId: chapter.id,
          questionText: `Integration question ${index + 1} ${suffix}`,
          reviewSummaryId: summaries[index].id,
          reviewTopic: `Topic ${index + 1}`,
          reviewPage: index === 0 ? 8 : 12,
          tags: [`chapter-${index + 1}`],
        },
      }),
    ),
  );

  const quiz = await prisma.quiz.create({
    data: {
      title: `Final quiz ${suffix}`,
      subjectId: subject.id,
      totalQuestions: 2,
      totalPoints: 2,
      questions: {
        create: questions.map((question, index) => ({
          questionId: question.id,
          questionOrder: index + 1,
          points: 1,
        })),
      },
    },
    include: {
      questions: {
        orderBy: { questionOrder: "asc" },
        include: { question: { include: { reviewSummary: true } } },
      },
    },
  });

  assert.equal(quiz.questions.length, 2);
  assert.equal(quiz.questions[0].question.reviewSummaryId, summaries[0].id);
  assert.equal(quiz.questions[1].question.reviewSummaryId, summaries[1].id);
  assert.equal(quiz.questions[0].question.reviewPage, 8);
  assert.equal(quiz.questions[1].question.reviewPage, 12);

  await assert.rejects(
    prisma.$executeRawUnsafe(
      `UPDATE "questions" SET "reviewPage" = 0 WHERE id = $1`,
      questions[0].id,
    ),
  );
  await assert.rejects(
    prisma.$executeRawUnsafe(
      `UPDATE "questions" SET "reviewSummaryId" = $1 WHERE id = $2`,
      randomUUID(),
      questions[0].id,
    ),
  );

  await prisma.studySummary.delete({ where: { id: summaries[0].id } });
  const preservedQuestion = await prisma.question.findUniqueOrThrow({
    where: { id: questions[0].id },
    select: { reviewSummaryId: true, reviewTopic: true, reviewPage: true },
  });
  assert.equal(preservedQuestion.reviewSummaryId, null);
  assert.equal(preservedQuestion.reviewTopic, "Topic 1");
  assert.equal(preservedQuestion.reviewPage, 8);

  const constraints = await prisma.$queryRawUnsafe(
    `SELECT conname, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conrelid = 'questions'::regclass
       AND conname IN ('questions_reviewPage_check', 'questions_reviewSummaryId_fkey')
     ORDER BY conname`,
  );
  assert.equal(constraints.length, 2);
  assert.match(String(constraints.find((row) => row.conname === "questions_reviewPage_check")?.definition), />= 1/);
  assert.match(
    String(constraints.find((row) => row.conname === "questions_reviewSummaryId_fkey")?.definition),
    /ON DELETE SET NULL/,
  );

  const indexes = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'questions_reviewSummaryId_idx'`,
  );
  assert.equal(indexes.length, 1);

  console.log(JSON.stringify({
    legacyQuestionCount,
    legacyReviewDataCount,
    chapterCount,
    theoryChapterCount,
    finalQuizQuestions: quiz.questions.length,
    setNullPreservedTopicAndPage: true,
    checkConstraint: true,
    foreignKey: true,
    index: true,
  }));
} finally {
  await prisma.$disconnect();
}

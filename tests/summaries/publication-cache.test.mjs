import test from "node:test";
import assert from "node:assert/strict";

import { moduleLoader } from "../admin/load-module.mjs";

test("published English summaries appear in the subject list and resolve without exposing another language", async () => {
  const calls = [];
  const now = new Date("2026-10-19T12:00:00.000Z");
  const detail = {
    id: "summary-en",
    title: "Lecture 2",
    slug: "lecture-2",
    language: "en",
    excerpt: null,
    accessType: "free",
    contentHtml: "<p>English content</p>",
    contentText: null,
    pdfAttachmentId: null,
    publishedAt: now,
    readingMinutes: null,
    isFeatured: false,
    chapter: { id: "chapter-2", name: "Chapter 2", chapterNumber: 2 },
  };
  const prisma = {
    subject: { findFirst: async () => ({ id: "subject-1" }) },
    $queryRaw: async (query) => {
      assert.doesNotMatch(query.sql, /summary\."language"\s*=/);
      return [{
        ...detail,
        chapterId: "chapter-2",
        chapterName: "Chapter 2",
        chapterNumber: 2,
        hasReadableContent: true,
      }];
    },
    studySummary: {
      findFirst: async ({ where }) => {
        calls.push(where);
        return where.slug ? detail : { contentHtml: detail.contentHtml, contentText: null };
      },
    },
  };
  const mocks = {
    "@/lib/prisma": { prisma },
    "@/lib/server/payment-scope": {
      isPaymentSubject: () => false,
      paymentSubjectSelect: { id: true },
      publishedSubjectWhere: () => ({}),
    },
    "@/lib/server/access-control": { checkStudySummaryAccess: async () => ({ allowed: true }) },
    "react": { cache: (fn) => fn },
    "next/cache": { unstable_cache: (fn) => fn },
  };
  const { getPublishedSubjectSummaries, getPublishedSubjectSummaryBySlug, getPublishedStudySummaryContent } =
    moduleLoader(mocks)("src/lib/server/study-summaries.ts");

  const list = await getPublishedSubjectSummaries("subject-1");
  assert.equal(list.length, 1);
  assert.equal(list[0].language, "en");
  assert.equal((await getPublishedSubjectSummaryBySlug("subject-1", "lecture-2", "en"))?.id, "summary-en");
  assert.equal(calls[0].language, "en");
  assert.equal((await getPublishedStudySummaryContent("summary-en"))?.contentHtml, detail.contentHtml);
  assert.equal("language" in calls[1], false);
});

test("English links are distinct and chapter paths are invalidated when summaries change", () => {
  const { summaryLanguageFromQuery, summaryQuery } =
    moduleLoader()("src/lib/public/study-summary-routes.ts");
  assert.equal(summaryLanguageFromQuery("en"), "en");
  assert.equal(summaryLanguageFromQuery("unknown"), "ar");
  assert.equal(summaryQuery("ar"), "");
  assert.equal(summaryQuery("en"), "?lang=en");
  assert.equal(summaryQuery("en", "Topic A"), "?lang=en&reviewTopic=Topic+A");

  const paths = [];
  const { revalidateStudySummaryCache } = moduleLoader({
    "next/cache": { revalidatePath: (path) => paths.push(path), revalidateTag: () => {} },
  })("src/lib/cache-invalidation.ts");
  revalidateStudySummaryCache({
    next: {
      id: "summary-en",
      subjectPath: "/SA/university/subject",
      chapterPath: "/SA/university/subject/chapters/chapter-2",
      summaryPath: "/SA/university/subject/summaries/lecture-2",
    },
  });
  assert.ok(paths.includes("/SA/university/subject/chapters/chapter-2"));
});

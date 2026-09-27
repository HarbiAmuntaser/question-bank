import "server-only";

import type { Prisma } from "@prisma/client";

import { encodeSlugPath } from "@/lib/public/slug-utils";

export const publicQuestionReviewSelect = {
  reviewSummaryId: true,
  reviewTopic: true,
  reviewPage: true,
  reviewSummary: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      chapterId: true,
      pdfAttachmentId: true,
      subject: {
        select: {
          id: true,
          major: {
            select: {
              id: true,
              university: {
                select: {
                  id: true,
                  code: true,
                  countryCode: true,
                  institutionType: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.QuestionSelect;

type QuestionReviewRow = Prisma.QuestionGetPayload<{
  select: {
    id: true;
    chapterId: true;
    reviewSummaryId: true;
    reviewTopic: true;
    reviewPage: true;
    reviewSummary: typeof publicQuestionReviewSelect.reviewSummary;
  };
}>;

function summaryHref(summary: NonNullable<QuestionReviewRow["reviewSummary"]>) {
  const university = summary.subject.major.university;
  const countryCode = university.countryCode?.trim().toUpperCase();
  const institutionType = university.institutionType?.trim().toLowerCase();
  if (!countryCode || !institutionType) return null;

  return (
    `/${countryCode}/${institutionType}` +
    `/universities/${encodeSlugPath(university.code || university.id)}` +
    `/majors/${encodeSlugPath(summary.subject.major.id)}` +
    `/subjects/${encodeSlugPath(summary.subject.id)}` +
    `/summaries/${encodeSlugPath(summary.slug)}`
  );
}

export function publicQuestionReviewData(question: QuestionReviewRow, now = new Date()) {
  const summary = question.reviewSummary;
  const validSummary = Boolean(
    question.reviewSummaryId &&
      summary &&
      summary.chapterId === question.chapterId &&
      summary.status === "published" &&
      summary.publishedAt &&
      summary.publishedAt <= now,
  );

  if (!validSummary || !summary) {
    return {
      reviewSummaryId: null,
      reviewTopic: question.reviewTopic,
      reviewPage: question.reviewPage,
      reviewSummary: null,
    };
  }

  return {
    reviewSummaryId: summary.id,
    reviewTopic: question.reviewTopic,
    reviewPage: question.reviewPage,
    reviewSummary: {
      id: summary.id,
      title: summary.title,
      slug: summary.slug,
      href: summaryHref(summary),
      hasPdf: Boolean(summary.pdfAttachmentId),
    },
  };
}

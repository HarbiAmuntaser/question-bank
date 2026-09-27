import "server-only";

import type { PrismaClient } from "@prisma/client";

type ReviewTargetDb = Pick<PrismaClient, "studySummary" | "question">;

type ReviewPdfAttachment = {
  id: string;
  kind: string;
  ownerType: string;
  ownerId: string;
  storageProvider: string;
  visibility: string;
  bucket: string | null;
  storageKey: string | null;
  contentType: string | null;
  url: string | null;
};

export class QuestionReviewTargetError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "QuestionReviewTargetError";
  }
}

function hasPdfContentType(contentType: string | null) {
  if (!contentType) return true;
  return contentType.split(";")[0]?.trim().toLowerCase() === "application/pdf";
}

function hasSafePublicUrl(url: string | null, storageProvider: string, visibility: string) {
  const value = url?.trim();
  if (!value) return false;
  if (storageProvider === "local") return value.startsWith("/uploads/attachments/");
  if (storageProvider !== "external_url" && visibility !== "public") return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isUsableQuestionReviewPdf(
  attachment: ReviewPdfAttachment | null | undefined,
  summary: { id: string; subjectId: string; chapterId: string | null },
) {
  if (!attachment || attachment.kind !== "pdf" || !hasPdfContentType(attachment.contentType)) return false;

  const ownerIsValid =
    (attachment.ownerType === "study_summary" && attachment.ownerId === summary.id) ||
    (attachment.ownerType === "subject" && attachment.ownerId === summary.subjectId) ||
    (attachment.ownerType === "chapter" && summary.chapterId && attachment.ownerId === summary.chapterId);
  if (!ownerIsValid) return false;

  if (attachment.storageProvider === "r2" && attachment.visibility === "private") {
    return Boolean(attachment.bucket?.trim() && attachment.storageKey?.trim());
  }

  return hasSafePublicUrl(attachment.url, attachment.storageProvider, attachment.visibility);
}

export async function validateQuestionReviewTarget(
  db: ReviewTargetDb,
  input: { chapterId: string; reviewSummaryId?: string | null; reviewPage?: number | null },
) {
  if (!input.reviewSummaryId) return null;

  const summary = await db.studySummary.findUnique({
    where: { id: input.reviewSummaryId },
    select: {
      id: true,
      subjectId: true,
      chapterId: true,
      pdfAttachment: {
        select: {
          id: true,
          kind: true,
          ownerType: true,
          ownerId: true,
          storageProvider: true,
          visibility: true,
          bucket: true,
          storageKey: true,
          contentType: true,
          url: true,
        },
      },
    },
  });

  if (!summary) throw new QuestionReviewTargetError("review_summary_not_found");
  if (!summary.chapterId || summary.chapterId !== input.chapterId) {
    throw new QuestionReviewTargetError("review_summary_chapter_mismatch");
  }
  if (input.reviewPage && !isUsableQuestionReviewPdf(summary.pdfAttachment, summary)) {
    throw new QuestionReviewTargetError("review_summary_pdf_required");
  }

  return summary;
}

export async function ensureSummaryChapterMoveIsSafe(
  db: ReviewTargetDb,
  input: { summaryId: string; nextChapterId: string | null },
) {
  const incompatible = await db.question.findFirst({
    where: {
      reviewSummaryId: input.summaryId,
      ...(input.nextChapterId ? { chapterId: { not: input.nextChapterId } } : {}),
    },
    select: { id: true },
  });

  if (incompatible) throw new QuestionReviewTargetError("review_summary_has_incompatible_questions");
}

export async function countSummaryReviewPageQuestions(db: ReviewTargetDb, summaryId: string) {
  return db.question.count({
    where: { reviewSummaryId: summaryId, reviewPage: { not: null } },
  });
}

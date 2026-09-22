import "server-only";

import type { Prisma, QuizAccessType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isPaymentSubject, paymentPlanWhere, paymentSubjectSelect } from "@/lib/server/payment-scope";

type PaymentMediaDb = Pick<Prisma.TransactionClient, "attachment" | "paidAccessPlan" | "studySummary" | "subject">;

type PdfAttachment = {
  storageProvider: string;
  visibility: string;
  bucket: string | null;
  storageKey: string | null;
};

// Paid summaries may link to their authorized PDF route, but never directly to a public binary.
const directMediaReference = /(?:https?:\/\/|\/uploads\/attachments\/)[^\s"'<>]+\.(?:pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)(?:[?#][^\s"'<>]*)?/i;

export function hasDirectPublicMediaReference(...values: Array<string | null | undefined>) {
  return values.some((value) => Boolean(value && directMediaReference.test(value)));
}

export function isPrivateR2Pdf(attachment: PdfAttachment | null | undefined) {
  return attachment?.storageProvider === "r2" && attachment.visibility === "private" && Boolean(attachment.bucket && attachment.storageKey);
}

async function summaryRequiresPrivateMedia(
  db: PaymentMediaDb,
  subjectId: string,
  accessType: QuizAccessType,
) {
  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: paymentSubjectSelect });
  if (!subject || !isPaymentSubject(subject) || accessType === "free") return false;
  if (accessType === "paid") return true;
  return Boolean(await db.paidAccessPlan.findFirst({ where: { isActive: true, subjectId, ...paymentPlanWhere() }, select: { id: true } }));
}

export async function getPaymentSummaryMediaIssue(
  input: {
    subjectId: string;
    accessType: QuizAccessType;
    pdfAttachmentId: string | null | undefined;
    contentHtml: string | null | undefined;
    contentText: string | null | undefined;
  },
  db: PaymentMediaDb = prisma,
) {
  if (!(await summaryRequiresPrivateMedia(db, input.subjectId, input.accessType))) return null;
  if (hasDirectPublicMediaReference(input.contentHtml, input.contentText)) return "paid_summary_public_media_reference";
  if (!input.pdfAttachmentId) return null;
  const attachment = await db.attachment.findUnique({
    where: { id: input.pdfAttachmentId },
    select: { storageProvider: true, visibility: true, bucket: true, storageKey: true },
  });
  return isPrivateR2Pdf(attachment) ? null : "paid_pdf_private_storage_required";
}

export async function assertPaymentPlanPrivateSummaryMedia(db: PaymentMediaDb, subjectId: string) {
  const summaries = await db.studySummary.findMany({
    where: { subjectId, accessType: { not: "free" } },
    select: {
      id: true,
      contentHtml: true,
      contentText: true,
      pdfAttachment: { select: { storageProvider: true, visibility: true, bucket: true, storageKey: true } },
    },
  });
  for (const summary of summaries) {
    if (hasDirectPublicMediaReference(summary.contentHtml, summary.contentText) ||
      (summary.pdfAttachment && !isPrivateR2Pdf(summary.pdfAttachment))) {
      throw new Error("payment_private_media_required");
    }
  }
}

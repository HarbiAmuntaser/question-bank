import "server-only";

import { createHmac } from "node:crypto";

import type { AccessStatus } from "@/lib/payment-access";
import { readChapterAttachmentPurpose } from "@/lib/chapter-attachments";
import { prisma } from "@/lib/prisma";
import { checkScopeAccess, checkStudySummaryAccess } from "@/lib/server/access-control";
import { guestAccessTokenFromRequest } from "@/lib/server/code-access-cookie";
import { getPaymentStudent, publishedSubjectWhere } from "@/lib/server/payment-scope";
import { isPublicStudySummaryId } from "@/lib/server/public-content-visibility";
import { createPresignedGetUrl } from "@/lib/server/storage";
import { getR2StorageConfig } from "@/lib/server/storage/config";

const PDF_CONTENT_TYPE = "application/pdf";
const MIN_WATERMARK_SECRET_BYTES = 32;

type PdfAttachment = {
  id: string;
  title: string | null;
  originalName: string | null;
  kind: string;
  ownerType: string;
  ownerId: string;
  storageProvider: string;
  visibility: string;
  bucket: string | null;
  storageKey: string | null;
  contentType: string | null;
  checksumSha256: string | null;
  url: string | null;
};

export type PdfViewerSource = {
  title: string;
  sourceUrl: string;
  sourceExpiresAt: string | null;
  watermark: {
    text: string;
    reference: string | null;
    traceable: boolean;
  };
};

export class PdfViewerSourceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = "PdfViewerSourceError";
  }
}

function normalizedPdfContentType(value: string | null) {
  return value?.split(";")[0]?.trim().toLowerCase() || PDF_CONTENT_TYPE;
}

function safePublicPdfTarget(attachment: PdfAttachment) {
  const value = attachment.url?.trim();
  if (!value) return null;

  if (attachment.storageProvider === "local") {
    return value.startsWith("/uploads/attachments/") ? value : null;
  }

  if (attachment.storageProvider === "external_url" || attachment.visibility === "public") {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  return null;
}

function watermarkSecret() {
  const secret = process.env.DOCUMENT_WATERMARK_SECRET?.trim() ?? "";
  if (Buffer.byteLength(secret, "utf8") < MIN_WATERMARK_SECRET_BYTES) {
    throw new PdfViewerSourceError("pdf_watermark_configuration_unavailable", 503);
  }
  return secret;
}

export function createPdfWatermarkReference(input: {
  principalType: "account" | "guest_grant";
  principalId: string;
  attachmentId: string;
  attachmentChecksum: string | null;
  secret?: string;
}) {
  const secret = input.secret ?? watermarkSecret();
  if (Buffer.byteLength(secret, "utf8") < MIN_WATERMARK_SECRET_BYTES) {
    throw new PdfViewerSourceError("pdf_watermark_configuration_unavailable", 503);
  }
  const digest = createHmac("sha256", secret)
    .update("mustawak-pdf-watermark-v1\0")
    .update(input.principalType)
    .update("\0")
    .update(input.principalId)
    .update("\0")
    .update(input.attachmentId)
    .update("\0")
    .update(input.attachmentChecksum ?? input.attachmentId)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();

  return `WM1-${digest}`;
}

async function watermarkForAccess(access: AccessStatus, attachment: PdfAttachment) {
  if (access.reason !== "entitled") {
    return { text: "MUSTAWAK.COM", reference: null, traceable: false };
  }

  let principalType: "account" | "guest_grant";
  let principalId: string | null = null;

  if (access.accessSource === "guest_code") {
    principalType = "guest_grant";
    principalId = access.codeGrantId;
  } else {
    principalType = "account";
    principalId = (await getPaymentStudent())?.id ?? null;
  }

  if (!principalId) {
    throw new PdfViewerSourceError("pdf_watermark_principal_unavailable", 403);
  }

  const reference = createPdfWatermarkReference({
    principalType,
    principalId,
    attachmentId: attachment.id,
    attachmentChecksum: attachment.checksumSha256,
  });

  return {
    text: `MUSTAWAK.COM · ${reference}`,
    reference,
    traceable: true,
  };
}

async function sourceForAttachment(attachment: PdfAttachment) {
  if (normalizedPdfContentType(attachment.contentType) !== PDF_CONTENT_TYPE || attachment.kind !== "pdf") {
    throw new PdfViewerSourceError("invalid_pdf_attachment", 409);
  }

  if (attachment.storageProvider === "r2" && attachment.visibility === "private") {
    if (!attachment.bucket || !attachment.storageKey) {
      throw new PdfViewerSourceError("pdf_storage_unavailable", 409);
    }
    const ttlSeconds = getR2StorageConfig().signedUrlTtlSeconds;
    return {
      sourceUrl: await createPresignedGetUrl({
        bucket: attachment.bucket,
        storageKey: attachment.storageKey,
        expiresInSeconds: ttlSeconds,
      }),
      sourceExpiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }

  const publicTarget = safePublicPdfTarget(attachment);
  if (!publicTarget) throw new PdfViewerSourceError("pdf_storage_unavailable", 409);
  return { sourceUrl: publicTarget, sourceExpiresAt: null };
}

const attachmentSelect = {
  id: true,
  title: true,
  originalName: true,
  kind: true,
  ownerType: true,
  ownerId: true,
  storageProvider: true,
  visibility: true,
  bucket: true,
  storageKey: true,
  contentType: true,
  checksumSha256: true,
  url: true,
} as const;

export async function getSummaryPdfViewerSource(request: Request, summaryId: string): Promise<PdfViewerSource> {
  if (!(await isPublicStudySummaryId(summaryId))) {
    throw new PdfViewerSourceError("summary_not_found", 404);
  }

  const summary = await prisma.studySummary.findUnique({
    where: { id: summaryId },
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      subjectId: true,
      chapterId: true,
      pdfAttachmentId: true,
      pdfAttachment: { select: attachmentSelect },
    },
  });
  const now = new Date();
  if (!summary || summary.status !== "published" || !summary.publishedAt || summary.publishedAt > now) {
    throw new PdfViewerSourceError("summary_not_found", 404);
  }
  if (!summary.pdfAttachmentId || !summary.pdfAttachment) {
    throw new PdfViewerSourceError("summary_pdf_not_found", 404);
  }

  const attachment = summary.pdfAttachment;
  const ownerIsValid =
    (attachment.ownerType === "study_summary" && attachment.ownerId === summary.id) ||
    (attachment.ownerType === "subject" && attachment.ownerId === summary.subjectId) ||
    (attachment.ownerType === "chapter" && Boolean(summary.chapterId) && attachment.ownerId === summary.chapterId);
  if (!ownerIsValid) throw new PdfViewerSourceError("invalid_summary_pdf_attachment", 409);

  const access = await checkStudySummaryAccess({
    summaryId,
    guestSessionToken: guestAccessTokenFromRequest(request),
  });
  if (!access.allowed) throw new PdfViewerSourceError("summary_pdf_access_denied", 403);
  if (access.effectiveAccessType === "paid" && (attachment.storageProvider !== "r2" || attachment.visibility !== "private")) {
    throw new PdfViewerSourceError("paid_pdf_private_storage_required", 409);
  }

  const [source, watermark] = await Promise.all([
    sourceForAttachment(attachment),
    watermarkForAccess(access, attachment),
  ]);
  return {
    title: summary.title,
    ...source,
    watermark,
  };
}

export async function getChapterAttachmentPdfViewerSource(
  request: Request,
  chapterId: string,
  attachmentId: string,
): Promise<PdfViewerSource> {
  const [chapter, attachment] = await Promise.all([
    prisma.chapter.findFirst({
      where: { id: chapterId, isActive: true, subject: publishedSubjectWhere() },
      select: { id: true, subjectId: true },
    }),
    prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ownerType: "chapter",
        ownerId: chapterId,
        kind: "pdf",
        storageProvider: "r2",
        visibility: "private",
        contentType: PDF_CONTENT_TYPE,
      },
      select: { ...attachmentSelect, meta: true },
    }),
  ]);
  if (!chapter || !attachment || !readChapterAttachmentPurpose(attachment.meta)) {
    throw new PdfViewerSourceError("chapter_attachment_not_found", 404);
  }

  const access = await checkScopeAccess({
    subjectId: chapter.subjectId,
    guestSessionToken: guestAccessTokenFromRequest(request),
  });
  if (!access.allowed) throw new PdfViewerSourceError("chapter_attachment_access_denied", 403);

  const [source, watermark] = await Promise.all([
    sourceForAttachment(attachment),
    watermarkForAccess(access, attachment),
  ]);
  return {
    title: attachment.title || attachment.originalName || "ملف PDF",
    ...source,
    watermark,
  };
}

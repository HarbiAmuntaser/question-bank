import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  hasPdfFileSignature,
  isChapterAttachmentPurpose,
  type ChapterAttachmentPurpose,
} from "@/lib/chapter-attachments";

type ChapterOwnerLookup = Pick<PrismaClient, "chapter">;

export class ChapterAttachmentPolicyError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ChapterAttachmentPolicyError";
  }
}

export async function validateChapterAttachmentUpload(
  db: ChapterOwnerLookup,
  input: {
    ownerType: string;
    ownerId: string;
    purpose: string;
    kind: string;
    visibility: string;
    contentType: string;
    bytes: Uint8Array;
  },
): Promise<{ id: string; subjectId: string; purpose: ChapterAttachmentPurpose }> {
  if (input.ownerType !== "chapter" || !isChapterAttachmentPurpose(input.purpose)) {
    throw new ChapterAttachmentPolicyError("invalid_chapter_attachment_purpose");
  }
  if (input.kind !== "pdf" || input.contentType !== "application/pdf") {
    throw new ChapterAttachmentPolicyError("chapter_attachment_must_be_pdf");
  }
  if (input.visibility !== "private") {
    throw new ChapterAttachmentPolicyError("chapter_attachment_must_be_private");
  }
  if (!hasPdfFileSignature(input.bytes)) {
    throw new ChapterAttachmentPolicyError("invalid_pdf_file_signature");
  }

  const chapter = await db.chapter.findUnique({
    where: { id: input.ownerId },
    select: { id: true, subjectId: true },
  });
  if (!chapter) {
    throw new ChapterAttachmentPolicyError("chapter_not_found");
  }

  return { ...chapter, purpose: input.purpose };
}

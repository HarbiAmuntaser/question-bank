export const chapterAttachmentPurposes = [
  "chapter-question-bank",
  "chapter-practical-file",
  "chapter-solution",
] as const;

export type ChapterAttachmentPurpose = (typeof chapterAttachmentPurposes)[number];

export const chapterAttachmentPurposeLabels: Record<ChapterAttachmentPurpose, string> = {
  "chapter-question-bank": "بنك أسئلة مطبوع",
  "chapter-practical-file": "ملف عملي",
  "chapter-solution": "حلول",
};

export function isChapterAttachmentPurpose(value: unknown): value is ChapterAttachmentPurpose {
  return typeof value === "string" && chapterAttachmentPurposes.includes(value as ChapterAttachmentPurpose);
}

export function readChapterAttachmentPurpose(meta: unknown): ChapterAttachmentPurpose | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const purpose = (meta as { purpose?: unknown }).purpose;
  return isChapterAttachmentPurpose(purpose) ? purpose : null;
}

export function hasPdfFileSignature(bytes: Uint8Array) {
  const limit = Math.min(bytes.length, 1024);
  for (let index = 0; index <= limit - 5; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46 &&
      bytes[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

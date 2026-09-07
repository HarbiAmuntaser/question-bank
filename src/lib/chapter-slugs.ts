export function normalizeChapterSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildChapterSlug(name: string, chapterNumber?: number | null) {
  const normalizedName = normalizeChapterSlug(name);
  if (normalizedName) return normalizedName;
  return chapterNumber ? `chapter-${chapterNumber}` : "chapter";
}

const RESERVED_CHAPTER_SLUGS = new Set(["chapters", "quizzes", "summaries", "subjects", "majors"]);

export type ChapterSlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; error: "chapter_slug_required" | "chapter_slug_too_long" | "reserved_chapter_slug" };

export function validateChapterSlug(value: unknown): ChapterSlugValidationResult {
  const slug = normalizeChapterSlug(typeof value === "string" ? value : "");

  if (!slug) return { ok: false, error: "chapter_slug_required" };
  if (slug.length > 160) return { ok: false, error: "chapter_slug_too_long" };
  if (RESERVED_CHAPTER_SLUGS.has(slug)) return { ok: false, error: "reserved_chapter_slug" };

  return { ok: true, slug };
}

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

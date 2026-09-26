const COLLEGE_SLUG_MAX_LENGTH = 190;

const RESERVED_COLLEGE_SLUGS = new Set([
  "chapters",
  "colleges",
  "levels",
  "majors",
  "quizzes",
  "subjects",
  "summaries",
]);

export function normalizeCollegeSlug(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/gu, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildCollegeSlug(name: string) {
  return normalizeCollegeSlug(name);
}

export type CollegeSlugValidationResult =
  | { ok: true; slug: string }
  | {
      ok: false;
      error: "college_slug_required" | "college_slug_too_long" | "reserved_college_slug";
    };

export function validateCollegeSlug(value: unknown): CollegeSlugValidationResult {
  const slug = normalizeCollegeSlug(typeof value === "string" ? value : "");

  if (!slug) return { ok: false, error: "college_slug_required" };
  if (slug.length > COLLEGE_SLUG_MAX_LENGTH) {
    return { ok: false, error: "college_slug_too_long" };
  }
  if (RESERVED_COLLEGE_SLUGS.has(slug)) {
    return { ok: false, error: "reserved_college_slug" };
  }

  return { ok: true, slug };
}

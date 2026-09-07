import "server-only";

import { prisma } from "@/lib/prisma";
import { validateChapterSlug } from "@/lib/chapter-slugs";

type ChapterSeoSlugError =
  | "seo_owner_not_found"
  | "chapter_slug_required"
  | "chapter_slug_too_long"
  | "reserved_chapter_slug"
  | "chapter_slug_already_exists";

export type PreparedChapterSeoSlug = {
  chapterId: string;
  subjectId: string;
  slug: string;
  shouldPersist: boolean;
};

export async function prepareChapterSeoSlug(
  chapterId: string,
  requestedSlug: unknown,
): Promise<{ ok: true; data: PreparedChapterSeoSlug } | { ok: false; error: ChapterSeoSlugError }> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, subjectId: true, slug: true },
  });

  if (!chapter) return { ok: false, error: "seo_owner_not_found" };

  const storedSlug = chapter.slug?.trim();
  if (storedSlug) {
    return {
      ok: true,
      data: { chapterId: chapter.id, subjectId: chapter.subjectId, slug: storedSlug, shouldPersist: false },
    };
  }

  const validated = validateChapterSlug(requestedSlug);
  if (!validated.ok) return validated;

  const duplicate = await prisma.chapter.findFirst({
    where: {
      subjectId: chapter.subjectId,
      slug: validated.slug,
      id: { not: chapter.id },
    },
    select: { id: true },
  });

  if (duplicate) return { ok: false, error: "chapter_slug_already_exists" };

  return {
    ok: true,
    data: {
      chapterId: chapter.id,
      subjectId: chapter.subjectId,
      slug: validated.slug,
      shouldPersist: true,
    },
  };
}

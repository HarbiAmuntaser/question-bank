import "server-only";

import { Prisma } from "@prisma/client";
import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS, CACHE_TTL, cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export type PublicStudySummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  accessType: "inherit" | "free" | "paid";
  publishedAt: string;
  readingMinutes: number | null;
  isFeatured: boolean;
  chapter: { id: string; name: string; chapterNumber: number | null } | null;
  hasReadableContent: boolean;
  hasPdf: boolean;
};

export type ProtectedStudySummaryContent = {
  contentHtml: string | null;
  contentText: string | null;
};

export type StudySummarySeoMeta = {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
};

type PublicStudySummaryQueryRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  accessType: "inherit" | "free" | "paid";
  pdfAttachmentId: string | null;
  publishedAt: Date;
  readingMinutes: number | null;
  isFeatured: boolean;
  hasReadableContent: boolean;
  chapterId: string | null;
  chapterName: string | null;
  chapterNumber: number | null;
};

function serializeSummary(summary: PublicStudySummaryQueryRow): PublicStudySummary {
  return {
    id: summary.id,
    title: summary.title,
    slug: summary.slug,
    excerpt: summary.excerpt,
    accessType: summary.accessType,
    publishedAt: summary.publishedAt.toISOString(),
    readingMinutes: summary.readingMinutes,
    isFeatured: summary.isFeatured,
    chapter: summary.chapterId
      ? {
          id: summary.chapterId,
          name: summary.chapterName ?? "",
          chapterNumber: summary.chapterNumber,
        }
      : null,
    hasReadableContent: summary.hasReadableContent,
    hasPdf: Boolean(summary.pdfAttachmentId),
  };
}

function serializeSummaryDetail(summary: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  accessType: "inherit" | "free" | "paid";
  contentHtml: string | null;
  contentText: string | null;
  pdfAttachmentId: string | null;
  publishedAt: Date | null;
  readingMinutes: number | null;
  isFeatured: boolean;
  chapter: { id: string; name: string; chapterNumber: number | null } | null;
}): PublicStudySummary {
  if (!summary.publishedAt) throw new Error("published_study_summary_missing_date");

  return {
    id: summary.id,
    title: summary.title,
    slug: summary.slug,
    excerpt: summary.excerpt,
    accessType: summary.accessType,
    publishedAt: summary.publishedAt.toISOString(),
    readingMinutes: summary.readingMinutes,
    isFeatured: summary.isFeatured,
    chapter: summary.chapter,
    hasReadableContent: Boolean(summary.contentHtml?.trim() || summary.contentText?.trim()),
    hasPdf: Boolean(summary.pdfAttachmentId),
  };
}

async function queryPublishedSubjectSummaries(subjectId: string): Promise<PublicStudySummaryQueryRow[]> {
  const now = new Date();

  // Compute content availability in PostgreSQL so protected bodies never enter
  // the public summary list loader.
  return prisma.$queryRaw<PublicStudySummaryQueryRow[]>(Prisma.sql`
    SELECT
      summary."id",
      summary."title",
      summary."slug",
      summary."excerpt",
      summary."accessType",
      summary."pdfAttachmentId",
      summary."publishedAt",
      summary."readingMinutes",
      summary."isFeatured",
      (
        COALESCE(summary."contentHtml", '') ~ '[^[:space:]]'
        OR COALESCE(summary."contentText", '') ~ '[^[:space:]]'
      ) AS "hasReadableContent",
      chapter."id" AS "chapterId",
      chapter."name" AS "chapterName",
      chapter."chapterNumber" AS "chapterNumber"
    FROM "study_summaries" AS summary
    LEFT JOIN "chapters" AS chapter ON chapter."id" = summary."chapterId"
    WHERE summary."subjectId" = ${subjectId}
      AND summary."status" = 'published'::"StudySummaryStatus"
      AND summary."publishedAt" IS NOT NULL
      AND summary."publishedAt" <= ${now}
      AND summary."language" = 'ar'::"ContentLanguage"
    ORDER BY summary."isFeatured" DESC, summary."sortOrder" ASC, summary."publishedAt" DESC
  `);
}

async function loadPublishedSubjectSummaries(subjectId: string): Promise<PublicStudySummary[]> {
  const rows = await queryPublishedSubjectSummaries(subjectId);

  return rows.map(serializeSummary);
}

async function loadPublishedSubjectSummaryBySlug(subjectId: string, slug: string): Promise<PublicStudySummary | null> {
  const now = new Date();
  const row = await prisma.studySummary.findFirst({
    where: {
      subjectId,
      slug,
      status: "published",
      publishedAt: { not: null, lte: now },
      language: "ar",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      accessType: true,
      contentHtml: true,
      contentText: true,
      pdfAttachmentId: true,
      publishedAt: true,
      readingMinutes: true,
      isFeatured: true,
      chapter: { select: { id: true, name: true, chapterNumber: true } },
    },
  });

  return row ? serializeSummaryDetail(row) : null;
}

export async function getPublishedStudySummaryContent(summaryId: string): Promise<ProtectedStudySummaryContent | null> {
  const now = new Date();
  return prisma.studySummary.findFirst({
    where: {
      id: summaryId,
      status: "published",
      publishedAt: { not: null, lte: now },
      language: "ar",
    },
    select: {
      contentHtml: true,
      contentText: true,
    },
  });
}

async function loadStudySummarySeoMeta(summaryId: string): Promise<StudySummarySeoMeta | null> {
  return prisma.seoMeta.findFirst({
    where: { ownerType: "study_summary", ownerId: summaryId, locale: "ar" },
    select: {
      metaTitle: true,
      metaDescription: true,
      ogTitle: true,
      ogDescription: true,
      ogImageUrl: true,
      noindex: true,
      nofollow: true,
    },
  });
}

export const getPublishedSubjectSummaries = cache(async (subjectId: string): Promise<PublicStudySummary[]> => {
  return unstable_cache(
    () => loadPublishedSubjectSummaries(subjectId),
    ["public-study-summaries-safe-v3", subjectId],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: cacheTags(
        "student-summaries",
        CACHE_TAGS.public.summaries,
        CACHE_TAGS.public.summariesBySubject(subjectId),
      ),
    },
  )();
});

export const getPublishedSubjectSummaryBySlug = cache(
  async (subjectId: string, slug: string): Promise<PublicStudySummary | null> => {
    return unstable_cache(
      () => loadPublishedSubjectSummaryBySlug(subjectId, slug),
      ["public-study-summary-detail-safe-v2", subjectId, slug],
      {
        revalidate: CACHE_TTL.publicLong,
        tags: cacheTags(
          "student-summary-detail",
          CACHE_TAGS.public.summaries,
          CACHE_TAGS.public.summariesBySubject(subjectId),
        ),
      },
    )();
  },
);

export const getStudySummarySeoMeta = cache(async (summaryId: string): Promise<StudySummarySeoMeta | null> => {
  return unstable_cache(
    () => loadStudySummarySeoMeta(summaryId),
    ["public-study-summary-seo", summaryId],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: cacheTags(
        CACHE_TAGS.public.seo,
        CACHE_TAGS.public.seoOwner("study_summary", summaryId),
        CACHE_TAGS.public.summary(summaryId),
      ),
    },
  )();
});

// Minimal defense-in-depth for trusted admin HTML. Public summaries currently accept
// HTML only from admin workflows; add a dedicated sanitizer before broader editors.
export function prepareTrustedSummaryHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|form|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

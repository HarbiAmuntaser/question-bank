import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS, CACHE_TTL, cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export type PublicSubjectChapter = {
  id: string;
  subjectId: string;
  name: string;
  slug: string | null;
  routeKey: string;
  chapterNumber: number | null;
  description: string | null;
  learningObjectives: string[];
};

export type PublicSubjectQuiz = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  questionCount: number;
  seoSlug: string | null;
  questionChapterIds: string[];
  chapter: { id: string; name: string } | null;
};

export type PublicSubjectChapterCatalog = {
  chapters: PublicSubjectChapter[];
  quizzes: PublicSubjectQuiz[];
};

export type ChapterSeoMeta = {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
};

async function loadSubjectChapterCatalog(subjectId: string): Promise<PublicSubjectChapterCatalog> {
  const [chapterRows, quizRows] = await Promise.all([
    prisma.chapter.findMany({
      where: { subjectId, isActive: true },
      orderBy: [{ chapterNumber: "asc" }, { name: "asc" }],
      select: {
        id: true,
        subjectId: true,
        name: true,
        slug: true,
        chapterNumber: true,
        description: true,
        learningObjectives: true,
      },
    }),
    prisma.quiz.findMany({
      where: {
        isActive: true,
        OR: [
          { subjectId },
          { questions: { some: { question: { chapter: { subjectId } } } } },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        accessType: true,
        isFreePreview: true,
        _count: { select: { questions: true } },
        questions: {
          select: {
            question: {
              select: {
                chapter: { select: { id: true, name: true, subjectId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const seoRows = quizRows.length
    ? await prisma.seoMeta.findMany({
        where: { ownerType: "exam", locale: "ar", ownerId: { in: quizRows.map((quiz) => quiz.id) } },
        select: { ownerId: true, slug: true },
      })
    : [];

  const seoSlugByQuiz = new Map(seoRows.map((row) => [row.ownerId, row.slug]));
  const activeChapterById = new Map(chapterRows.map((chapter) => [chapter.id, chapter]));

  return {
    chapters: chapterRows.map((chapter) => ({
      ...chapter,
      routeKey: chapter.slug?.trim() || chapter.id,
    })),
    quizzes: quizRows.map((quiz) => {
      const questionChapterIds = Array.from(
        new Set(quiz.questions.map((item) => item.question.chapter.id)),
      );
      const soleChapter = questionChapterIds.length === 1
        ? activeChapterById.get(questionChapterIds[0])
        : null;

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        accessType: quiz.accessType,
        isFreePreview: quiz.isFreePreview,
        questionCount: quiz._count.questions,
        seoSlug: seoSlugByQuiz.get(quiz.id) ?? null,
        questionChapterIds,
        chapter: soleChapter ? { id: soleChapter.id, name: soleChapter.name } : null,
      };
    }),
  };
}

async function loadPublicChapter(subjectId: string, routeKey: string): Promise<PublicSubjectChapter | null> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      subjectId,
      isActive: true,
      OR: [{ slug: routeKey }, { id: routeKey }],
    },
    select: {
      id: true,
      subjectId: true,
      name: true,
      slug: true,
      chapterNumber: true,
      description: true,
      learningObjectives: true,
    },
  });

  return chapter ? { ...chapter, routeKey: chapter.slug?.trim() || chapter.id } : null;
}

async function loadChapterSeoMeta(chapterId: string): Promise<ChapterSeoMeta | null> {
  return prisma.seoMeta.findFirst({
    where: { ownerType: "chapter", ownerId: chapterId, locale: "ar" },
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

export const getSubjectChapterCatalog = cache(async (subjectId: string) => {
  return unstable_cache(
    () => loadSubjectChapterCatalog(subjectId),
    ["public-subject-chapter-catalog-v1", subjectId],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: cacheTags(
        CACHE_TAGS.public.chapters,
        CACHE_TAGS.public.chaptersBySubject(subjectId),
        CACHE_TAGS.public.subject(subjectId),
        CACHE_TAGS.public.quizzesBySubject(subjectId),
      ),
    },
  )();
});

export const getPublicChapterByRouteKey = cache(async (subjectId: string, routeKey: string) => {
  return unstable_cache(
    () => loadPublicChapter(subjectId, routeKey),
    ["public-chapter-detail-v1", subjectId, routeKey],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: cacheTags(
        CACHE_TAGS.public.chapters,
        CACHE_TAGS.public.chaptersBySubject(subjectId),
        CACHE_TAGS.public.subject(subjectId),
      ),
    },
  )();
});

export const getChapterSeoMeta = cache(async (chapterId: string) => {
  return unstable_cache(
    () => loadChapterSeoMeta(chapterId),
    ["public-chapter-seo-v1", chapterId],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: cacheTags(
        CACHE_TAGS.public.seo,
        CACHE_TAGS.public.seoOwner("chapter", chapterId),
        CACHE_TAGS.public.chapter(chapterId),
      ),
    },
  )();
});

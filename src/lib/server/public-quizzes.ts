import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { stripPrefix } from "@/lib/public/slug-utils";
import {
  isPublicSubjectId,
  publicQuizWhere,
} from "@/lib/server/public-content-visibility";

const publicQuizPreviewSelect = {
  id: true,
  title: true,
  description: true,
  timeLimit: true,
  totalQuestions: true,
  totalPoints: true,
  createdAt: true,
  accessType: true,
  isFreePreview: true,
  _count: { select: { questions: true } },
  subject: {
    select: {
      id: true,
      name: true,
      code: true,
      major: {
        select: {
          id: true,
          name: true,
          code: true,
          degreeType: true,
          university: {
            select: {
              id: true,
              name: true,
              code: true,
              logoUrl: true,
              countryCode: true,
              institutionType: true,
              visibility: true,
            },
          },
        },
      },
    },
  },
  questions: {
    take: 1,
    select: {
      question: {
        select: {
          chapter: {
            select: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  major: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      degreeType: true,
                      university: {
                        select: {
                          id: true,
                          name: true,
                          code: true,
                          logoUrl: true,
                          countryCode: true,
                          institutionType: true,
                          visibility: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.QuizSelect;

type PublicQuizPreviewRow = Prisma.QuizGetPayload<{
  select: typeof publicQuizPreviewSelect;
}>;

export type PublicQuizPreview = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  totalQuestions: number;
  totalPoints: number;
  createdAt: string;
  accessType: PublicQuizPreviewRow["accessType"];
  isFreePreview: boolean;
  seo: { slug: string | null };
  context: {
    university: NonNullable<NonNullable<PublicQuizPreviewRow["subject"]>["major"]>["university"] & {
      seo: { slug: string | null };
    };
    major: NonNullable<NonNullable<PublicQuizPreviewRow["subject"]>["major"]> & {
      seo: { slug: string | null };
    };
    subject: NonNullable<PublicQuizPreviewRow["subject"]> & {
      seo: { slug: string | null };
    };
  };
};

export type NormalizedQuizSlug = {
  slugPath: string;
  variants: string[];
  last: string;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizePublicQuizSlug(parts: string[]): NormalizedQuizSlug {
  const clean = parts.map((part) => safeDecode(part).trim()).filter(Boolean);
  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;
  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = stripPrefix(slugPath, "اختبارات");
  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean)),
  );

  return { slugPath, variants, last };
}

function normalizePublicQuizId(raw: string) {
  return safeDecode(raw || "").trim();
}

async function loadPublicQuizPreview(id: string): Promise<PublicQuizPreview | null> {
  const quiz = await prisma.quiz.findFirst({
    where: { id, isActive: true, ...publicQuizWhere() },
    select: publicQuizPreviewSelect,
  });
  if (!quiz) return null;

  const subjectViaQuiz = quiz.subject ?? null;
  const subjectViaQuestion = quiz.questions[0]?.question.chapter?.subject ?? null;
  const effectiveSubject = subjectViaQuiz || subjectViaQuestion;
  const effectiveMajor = effectiveSubject?.major ?? null;
  const effectiveUniversity = effectiveMajor?.university ?? null;
  if (!effectiveSubject || !effectiveMajor || !effectiveUniversity) return null;

  const [universitySeo, majorSeo, subjectSeo, quizSeo] = await Promise.all([
    prisma.seoMeta.findFirst({
      where: { ownerType: "university", ownerId: effectiveUniversity.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.seoMeta.findFirst({
      where: { ownerType: "major", ownerId: effectiveMajor.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.seoMeta.findFirst({
      where: { ownerType: "subject", ownerId: effectiveSubject.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.seoMeta.findFirst({
      where: { ownerType: "exam", ownerId: quiz.id, locale: "ar" },
      select: { slug: true },
    }),
  ]);

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    timeLimit: quiz.timeLimit,
    totalQuestions: quiz.totalQuestions ?? quiz._count.questions ?? 0,
    totalPoints: quiz.totalPoints ?? 0,
    createdAt: quiz.createdAt.toISOString(),
    accessType: quiz.accessType,
    isFreePreview: quiz.isFreePreview,
    seo: { slug: quizSeo?.slug ?? null },
    context: {
      university: {
        ...effectiveUniversity,
        seo: { slug: universitySeo?.slug ?? null },
      },
      major: {
        ...effectiveMajor,
        seo: { slug: majorSeo?.slug ?? null },
      },
      subject: {
        ...effectiveSubject,
        seo: { slug: subjectSeo?.slug ?? null },
      },
    },
  };
}

const getPublicQuizPreviewByIdCached = (id: string) =>
  unstable_cache(
    () => loadPublicQuizPreview(id),
    ["student-quiz-preview-by-id", id, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-quizzes",
        "student-quiz-preview",
        CACHE_TAGS.public.quizzes,
        CACHE_TAGS.public.quiz(id),
      ],
    },
  )();

async function findQuizIdBySlug(input: NormalizedQuizSlug) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "exam", locale: "ar", slug: { in: input.variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const suffix = await prisma.seoMeta.findFirst({
    where: { ownerType: "exam", locale: "ar", slug: { endsWith: input.last } },
    select: { ownerId: true },
  });
  return suffix?.ownerId ?? null;
}

const getPublicQuizPreviewByResolvedSlugCached = (id: string) =>
  unstable_cache(
    () => getPublicQuizPreviewByIdCached(id),
    ["student-quiz-preview-by-slug-id", id, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-quizzes",
        "student-quiz-preview",
        CACHE_TAGS.public.quizzes,
        CACHE_TAGS.public.quiz(id),
      ],
    },
  )();

export function getPublicQuizPreviewById(rawId: string) {
  const id = normalizePublicQuizId(rawId);
  return id ? getPublicQuizPreviewByIdCached(id) : Promise.resolve(null);
}

export async function getPublicQuizPreviewBySlug(input: NormalizedQuizSlug) {
  if (!input.slugPath) return null;
  const quizId = await findQuizIdBySlug(input);
  return quizId ? getPublicQuizPreviewByResolvedSlugCached(quizId) : null;
}

const publicQuizListItemSelect = {
  id: true,
  title: true,
  description: true,
  timeLimit: true,
  createdAt: true,
  accessType: true,
  isFreePreview: true,
  _count: { select: { questions: true } },
} satisfies Prisma.QuizSelect;

type PublicQuizListItemRow = Prisma.QuizGetPayload<{
  select: typeof publicQuizListItemSelect;
}>;

export type PublicQuizListItem = Omit<PublicQuizListItemRow, "createdAt"> & {
  createdAt: string;
  seo: { slug: string | null };
};

export type PublicQuizzesBySubjectQuery = {
  limit?: string | null;
  degreeType?: string | null;
};

const listPublicQuizzesBySubjectCached = (subjectId: string, query: PublicQuizzesBySubjectQuery) =>
  unstable_cache(
    async (): Promise<PublicQuizListItem[]> => {
      const rawLimit = Number(query.limit ?? "60");
      const limit = Math.min(Math.max(rawLimit || 60, 1), 200);
      const degreeType = (query.degreeType ?? "").trim();
      const and: Prisma.QuizWhereInput[] = [
        {
          OR: [
            { subjectId },
            { questions: { some: { question: { chapter: { subjectId } } } } },
          ],
        },
      ];

      if (degreeType) {
        and.push({
          OR: [
            { subject: { major: { degreeType } } },
            {
              questions: {
                some: {
                  question: {
                    chapter: { subject: { major: { degreeType } } },
                  },
                },
              },
            },
          ],
        });
      }

      const quizzes = await prisma.quiz.findMany({
        where: { isActive: true, ...publicQuizWhere(), AND: and },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: publicQuizListItemSelect,
      });
      const ids = quizzes.map((quiz) => quiz.id);
      const seoRows = ids.length
        ? await prisma.seoMeta.findMany({
            where: { ownerType: "exam", locale: "ar", ownerId: { in: ids } },
            select: { ownerId: true, slug: true },
          })
        : [];
      const seoMap = new Map(seoRows.map((row) => [row.ownerId, row.slug]));

      return quizzes.map((quiz) => ({
        ...quiz,
        createdAt: quiz.createdAt.toISOString(),
        seo: { slug: seoMap.get(quiz.id) ?? null },
      }));
    },
    [
      "student-quizzes-by-subject",
      subjectId,
      query.degreeType ?? "",
      query.limit ?? "",
      getPublicVisibilityCacheKey(),
    ],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: [
        "student-quizzes",
        "student-quizzes-by-subject",
        CACHE_TAGS.public.quizzes,
        CACHE_TAGS.public.quizzesBySubject(subjectId),
      ],
    },
  )();

export async function getPublicQuizzesBySubject(
  rawSubjectId: string,
  query: PublicQuizzesBySubjectQuery = {},
) {
  const subjectId = rawSubjectId.trim();
  if (!subjectId || !(await isPublicSubjectId(subjectId))) return null;
  return listPublicQuizzesBySubjectCached(subjectId, query);
}

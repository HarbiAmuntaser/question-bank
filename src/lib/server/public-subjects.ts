import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { publicSubjectWhere } from "@/lib/server/public-content-visibility";

const publicSubjectDetailsSelect = {
  id: true,
  name: true,
  code: true,
  creditHours: true,
  semester: true,
  year: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { chapters: true } },
  major: {
    select: {
      id: true,
      name: true,
      code: true,
      degreeType: true,
      durationYears: true,
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
} satisfies Prisma.SubjectSelect;

type PublicSubjectRow = Prisma.SubjectGetPayload<{
  select: typeof publicSubjectDetailsSelect;
}>;

export type PublicSubjectFullDetails = Omit<
  PublicSubjectRow,
  "createdAt" | "updatedAt" | "major" | "_count"
> & {
  createdAt: string;
  updatedAt: string;
  seo: { slug: string | null };
  major: PublicSubjectRow["major"] & {
    seo: { slug: string | null };
    university: PublicSubjectRow["major"]["university"] & {
      seo: { slug: string | null };
    };
  };
  _count: { chapters: number; quizzes: number };
};

export type PublicSubjectDetails = Omit<
  PublicSubjectFullDetails,
  "isActive" | "createdAt" | "updatedAt"
>;

export type NormalizedSubjectSlug = {
  slugPath: string;
  variants: string[];
  last: string;
};

export function normalizePublicSubjectSlug(parts: string[]): NormalizedSubjectSlug {
  const clean = parts
    .map((part) => decodeURIComponent(part).trim())
    .filter(Boolean);
  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;
  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = slugPath.replace(/^مواد\//, "");
  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean)),
  );

  return { slugPath, variants, last };
}

export function normalizePublicSubjectCode(raw: string | string[] | null | undefined) {
  if (typeof raw === "string") return raw.trim();
  return Array.isArray(raw) ? (raw[0] ?? "").trim() : "";
}

export function normalizePublicSubjectId(raw: string | null | undefined) {
  return raw?.trim() ?? "";
}

async function addSubjectDetails(subject: PublicSubjectRow): Promise<PublicSubjectFullDetails> {
  const [subjectSeo, majorSeo, universitySeo, quizzesCount] = await Promise.all([
    prisma.seoMeta.findFirst({
      where: { ownerType: "subject", ownerId: subject.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.seoMeta.findFirst({
      where: { ownerType: "major", ownerId: subject.major.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.seoMeta.findFirst({
      where: {
        ownerType: "university",
        ownerId: subject.major.university.id,
        locale: "ar",
      },
      select: { slug: true },
    }),
    prisma.quiz.count({
      where: {
        isActive: true,
        OR: [
          { subjectId: subject.id },
          { questions: { some: { question: { chapter: { subjectId: subject.id } } } } },
        ],
      },
    }),
  ]);

  return {
    ...subject,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
    seo: { slug: subjectSeo?.slug ?? null },
    major: {
      ...subject.major,
      seo: { slug: majorSeo?.slug ?? null },
      university: {
        ...subject.major.university,
        seo: { slug: universitySeo?.slug ?? null },
      },
    },
    _count: { chapters: subject._count.chapters, quizzes: quizzesCount },
  };
}

async function findSubjectIdBySlug(input: NormalizedSubjectSlug) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "subject", locale: "ar", slug: { in: input.variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const suffixMatch = await prisma.seoMeta.findFirst({
    where: { ownerType: "subject", locale: "ar", slug: { endsWith: input.last } },
    select: { ownerId: true },
  });
  return suffixMatch?.ownerId ?? null;
}

const getSubjectDetailsByIdCached = (id: string) =>
  unstable_cache(
    async () => {
      const subject = await prisma.subject.findFirst({
        where: { id, isActive: true, AND: [publicSubjectWhere()] },
        select: publicSubjectDetailsSelect,
      });
      return subject ? addSubjectDetails(subject) : null;
    },
    ["student-subject-detail-by-id", id, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-subjects",
        "student-subject-detail",
        CACHE_TAGS.public.subjects,
        CACHE_TAGS.public.subject(id),
      ],
    },
  )();

export function toPublicSubjectDetails(
  subject: PublicSubjectFullDetails,
): PublicSubjectDetails {
  return {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    creditHours: subject.creditHours,
    semester: subject.semester,
    year: subject.year,
    description: subject.description,
    seo: subject.seo,
    major: subject.major,
    _count: subject._count,
  };
}

export async function getPublicSubjectBySlug(input: NormalizedSubjectSlug) {
  if (!input.slugPath) return null;
  const subjectId = await findSubjectIdBySlug(input);
  return subjectId ? getSubjectDetailsByIdCached(subjectId) : null;
}

export async function getPublicSubjectByCode(code: string) {
  if (!code) return null;
  const subject = await prisma.subject.findFirst({
    where: { isActive: true, code, ...publicSubjectWhere() },
    select: { id: true },
  });
  return subject ? getSubjectDetailsByIdCached(subject.id) : null;
}

export async function getPublicSubjectById(id: string) {
  if (!id) return null;
  return getSubjectDetailsByIdCached(id);
}

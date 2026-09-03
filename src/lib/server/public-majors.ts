import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { publicMajorWhere } from "@/lib/server/public-content-visibility";

const publicMajorDetailsInclude = {
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
  subjects: {
    orderBy: { name: "asc" },
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      creditHours: true,
      semester: true,
      year: true,
      description: true,
      _count: { select: { chapters: true } },
    },
  },
  _count: { select: { subjects: true } },
} satisfies Prisma.MajorInclude;

type PublicMajorRow = Prisma.MajorGetPayload<{
  include: typeof publicMajorDetailsInclude;
}>;

export type PublicMajorDetails = Omit<
  PublicMajorRow,
  "createdAt" | "updatedAt" | "university" | "_count"
> & {
  createdAt: string;
  updatedAt: string;
  seo: { slug: string | null };
  university: PublicMajorRow["university"] & { seo: { slug: string | null } };
  _count: { subjects: number; quizzes: number };
};

export type NormalizedMajorSlug = {
  slugPath: string;
  variants: string[];
  last: string;
};

export function normalizePublicMajorSlug(parts: string[]): NormalizedMajorSlug {
  const clean = parts
    .map((part) => decodeURIComponent(part).trim())
    .filter(Boolean);
  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;
  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = slugPath.replace(/^تخصصات\s*\/\s*/u, "");
  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean)),
  );

  return { slugPath, variants, last };
}

export function normalizePublicMajorCode(raw: string) {
  return raw?.trim() ?? "";
}

async function addMajorDetails(major: PublicMajorRow): Promise<PublicMajorDetails> {
  const [majorSeo, universitySeo, quizzesCount] = await Promise.all([
    prisma.seoMeta.findFirst({
      where: { ownerType: "major", ownerId: major.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.seoMeta.findFirst({
      where: { ownerType: "university", ownerId: major.university.id, locale: "ar" },
      select: { slug: true },
    }),
    prisma.quiz.count({
      where: { isActive: true, subject: { majorId: major.id } },
    }),
  ]);

  return {
    ...major,
    createdAt: major.createdAt.toISOString(),
    updatedAt: major.updatedAt.toISOString(),
    seo: { slug: majorSeo?.slug ?? null },
    university: {
      ...major.university,
      seo: { slug: universitySeo?.slug ?? null },
    },
    _count: { subjects: major.subjects.length, quizzes: quizzesCount },
  };
}

async function findMajorIdBySlug(input: NormalizedMajorSlug) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "major", locale: "ar", slug: { in: input.variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const suffixMatch = await prisma.seoMeta.findFirst({
    where: { ownerType: "major", locale: "ar", slug: { endsWith: input.last } },
    select: { ownerId: true },
  });
  return suffixMatch?.ownerId ?? null;
}

const getMajorDetailsByIdCached = (id: string) =>
  unstable_cache(
    async () => {
      const major = await prisma.major.findFirst({
        where: { id, isActive: true, AND: [publicMajorWhere()] },
        include: publicMajorDetailsInclude,
      });
      return major ? addMajorDetails(major) : null;
    },
    ["student-major-detail-by-id", id, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-majors",
        "student-major-detail",
        CACHE_TAGS.public.majors,
        CACHE_TAGS.public.major(id),
      ],
    },
  )();

export async function getPublicMajorBySlug(input: NormalizedMajorSlug) {
  if (!input.slugPath) return null;
  const majorId = await findMajorIdBySlug(input);
  return majorId ? getMajorDetailsByIdCached(majorId) : null;
}

export async function getPublicMajorByCode(code: string) {
  if (!code) return null;
  const major = await prisma.major.findFirst({
    where: { isActive: true, code, ...publicMajorWhere() },
    select: { id: true },
  });
  return major ? getMajorDetailsByIdCached(major.id) : null;
}

export async function getPublicMajorById(id: string) {
  if (!id) return null;
  return getMajorDetailsByIdCached(id);
}

import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { publicUniversityWhere } from "@/lib/server/public-content-visibility";

const publicUniversityDetailsSelect = {
  id: true,
  name: true,
  code: true,
  city: true,
  region: true,
  logoUrl: true,
  countryCode: true,
  institutionType: true,
  visibility: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  majors: {
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      degreeType: true,
      durationYears: true,
      _count: { select: { subjects: true } },
    },
  },
} satisfies Prisma.UniversitySelect;

type PublicUniversityRow = Prisma.UniversityGetPayload<{
  select: typeof publicUniversityDetailsSelect;
}>;

export type PublicUniversityDetails = Omit<PublicUniversityRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  seo: { slug: string | null };
  _count: { majors: number; quizzes: number };
};

export type NormalizedUniversitySlug = {
  slugPath: string;
  variants: string[];
  last: string;
};

export type NormalizedUniversityCode = {
  clean: string;
  variants: string[];
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripUniversitiesPrefix(input: string) {
  return input.replace(/^جامعات\s*\/\s*/u, "");
}

export function normalizePublicUniversitySlug(parts: string[]): NormalizedUniversitySlug {
  const cleanParts = parts
    .map((part) => safeDecode(String(part)).trim())
    .filter(Boolean);

  const slugPath = cleanParts.join("/").replace(/^\/+|\/+$/g, "");
  const last = slugPath.split("/").filter(Boolean).pop() ?? slugPath;
  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = stripUniversitiesPrefix(slugPath);
  const noPrefixNoLeading = stripUniversitiesPrefix(noLeadingSlash);
  const variants = Array.from(
    new Set(
      [
        slugPath,
        noLeadingSlash,
        noPrefix,
        noPrefixNoLeading,
        stripUniversitiesPrefix(noPrefix).replace(/^\/+/, ""),
      ]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  return { slugPath, variants, last };
}

export function normalizePublicUniversityCode(raw: string): NormalizedUniversityCode {
  const clean = decodeURIComponent(raw || "").trim();
  const variants = Array.from(
    new Set([clean, clean.toUpperCase(), clean.toLowerCase()].filter(Boolean)),
  );
  return { clean, variants };
}

async function addUniversityDetails(university: PublicUniversityRow): Promise<PublicUniversityDetails> {
  const [quizzesCount, seo] = await Promise.all([
    prisma.quiz.count({
      where: {
        isActive: true,
        subject: { major: { universityId: university.id } },
      },
    }),
    prisma.seoMeta.findFirst({
      where: { ownerType: "university", ownerId: university.id, locale: "ar" },
      select: { slug: true },
    }),
  ]);

  return {
    ...university,
    createdAt: university.createdAt.toISOString(),
    updatedAt: university.updatedAt.toISOString(),
    seo: { slug: seo?.slug ?? null },
    _count: { majors: university.majors.length, quizzes: quizzesCount },
  };
}

async function findUniversityIdBySlug(input: NormalizedUniversitySlug) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "university", locale: "ar", slug: { in: input.variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const suffixMatch = await prisma.seoMeta.findFirst({
    where: { ownerType: "university", locale: "ar", slug: { endsWith: input.last } },
    select: { ownerId: true },
  });
  return suffixMatch?.ownerId ?? null;
}

const getUniversityDetailsByIdCached = (id: string) =>
  unstable_cache(
    async () => {
      const university = await prisma.university.findFirst({
        where: { id, isActive: true, AND: [publicUniversityWhere()] },
        select: publicUniversityDetailsSelect,
      });
      return university ? addUniversityDetails(university) : null;
    },
    ["student-university-detail-by-id", id, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-universities",
        "student-university-detail",
        CACHE_TAGS.public.institutions,
        CACHE_TAGS.public.institution(id),
      ],
    },
  )();

const getUniversityByCodeCached = (input: NormalizedUniversityCode) =>
  unstable_cache(
    async () => {
      const university = await prisma.university.findFirst({
        where: {
          isActive: true,
          ...publicUniversityWhere(),
          OR: input.variants.map((value) => ({ code: value })),
        },
        select: publicUniversityDetailsSelect,
      });
      return university ? addUniversityDetails(university) : null;
    },
    ["student-university-detail-by-code", input.clean, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-universities",
        "student-university-detail",
        CACHE_TAGS.public.institutions,
      ],
    },
  )();

export async function getPublicUniversityBySlug(input: NormalizedUniversitySlug) {
  if (!input.slugPath) return null;
  const universityId = await findUniversityIdBySlug(input);
  return universityId ? getUniversityDetailsByIdCached(universityId) : null;
}

export async function getPublicUniversityByCode(input: NormalizedUniversityCode) {
  if (!input.clean) return null;
  return getUniversityByCodeCached(input);
}

import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { normalizeCollegeSlug } from "@/lib/college-slugs";
import { prisma } from "@/lib/prisma";
import { stripPrefix } from "@/lib/public/slug-utils";
import { publicUniversityWhere } from "@/lib/server/public-content-visibility";
import { normalizePublicUniversityCode, normalizePublicUniversitySlug } from "@/lib/server/public-universities";

const seoSelect = {
  id: true, ownerId: true, slug: true, metaTitle: true, metaDescription: true,
  ogTitle: true, ogDescription: true, ogImageUrl: true, canonicalUrl: true,
  noindex: true, nofollow: true, schemaJson: true,
} satisfies Prisma.SeoMetaSelect;

const collegeSelect = {
  id: true, universityId: true, name: true, slug: true, code: true,
  createdAt: true, updatedAt: true,
  university: { select: {
    id: true, name: true, code: true, logoUrl: true, countryCode: true,
    institutionType: true, visibility: true, createdAt: true, updatedAt: true,
  } },
  majors: {
    where: { isActive: true }, orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, collegeId: true, degreeType: true, durationYears: true },
  },
} satisfies Prisma.CollegeSelect;

type CollegeRow = Prisma.CollegeGetPayload<{ select: typeof collegeSelect }>;
type SeoRow = Prisma.SeoMetaGetPayload<{ select: typeof seoSelect }>;

export type PublicCollegeDetails = Omit<CollegeRow, "createdAt" | "updatedAt" | "university" | "majors"> & {
  createdAt: string;
  updatedAt: string;
  seo: SeoRow | null;
  university: Omit<CollegeRow["university"], "createdAt" | "updatedAt"> & {
    createdAt: string; updatedAt: string; seo: { slug: string | null };
  };
  majors: Array<CollegeRow["majors"][number] & { seo: { slug: string | null } }>;
};

function decode(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

async function findUniversity(routeKeyRaw: string) {
  const routeKey = stripPrefix(decode(routeKeyRaw).trim(), "جامعات");
  if (!routeKey) return null;
  const slug = normalizePublicUniversitySlug(routeKey.split("/"));
  const code = normalizePublicUniversityCode(routeKey);
  const owners = await prisma.seoMeta.findMany({
    where: { ownerType: "university", locale: "ar", slug: { in: slug.variants } },
    select: { ownerId: true },
  });
  return prisma.university.findFirst({
    where: {
      isActive: true, institutionType: "university", AND: [publicUniversityWhere()],
      OR: [
        ...(owners.length ? [{ id: { in: owners.map((row) => row.ownerId) } }] : []),
        { id: routeKey }, { code: { in: code.variants } },
      ],
    },
    select: { id: true },
  });
}

async function loadCollege(universityKey: string, collegeKeyRaw: string): Promise<PublicCollegeDetails | null> {
  const university = await findUniversity(universityKey);
  const collegeKey = decode(collegeKeyRaw).trim().replace(/^\/+|\/+$/g, "");
  if (!university || !collegeKey || collegeKey.includes("/")) return null;

  const slugs = Array.from(new Set([collegeKey, normalizeCollegeSlug(collegeKey)].filter(Boolean)));
  const codes = Array.from(new Set([collegeKey, collegeKey.toUpperCase(), collegeKey.toLowerCase()]));
  const college = await prisma.college.findFirst({
    where: {
      universityId: university.id, isActive: true,
      OR: [{ id: collegeKey }, { slug: { in: slugs } }, { code: { in: codes } }],
    },
    select: collegeSelect,
  });
  if (!college) return null;

  const seoRows = await prisma.seoMeta.findMany({
    where: { locale: "ar", OR: [
      { ownerType: "college", ownerId: college.id },
      { ownerType: "university", ownerId: college.university.id },
      { ownerType: "major", ownerId: { in: college.majors.map((major) => major.id) } },
    ] },
    select: seoSelect,
  });
  const seo = new Map(seoRows.map((row) => [row.ownerId, row]));
  return {
    ...college,
    createdAt: college.createdAt.toISOString(),
    updatedAt: college.updatedAt.toISOString(),
    seo: seo.get(college.id) ?? null,
    university: {
      ...college.university,
      createdAt: college.university.createdAt.toISOString(),
      updatedAt: college.university.updatedAt.toISOString(),
      seo: { slug: seo.get(college.university.id)?.slug ?? null },
    },
    majors: college.majors.map((major) => ({
      ...major, seo: { slug: seo.get(major.id)?.slug ?? null },
    })),
  };
}

export function getPublicCollegeByRouteKeys(universityKey: string, collegeKey: string) {
  const university = universityKey.trim();
  const college = collegeKey.trim();
  if (!university || !college) return Promise.resolve(null);
  return unstable_cache(
    () => loadCollege(university, college),
    ["student-college-detail", university, college, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [
        "student-college-detail", CACHE_TAGS.public.colleges, CACHE_TAGS.public.majors,
        CACHE_TAGS.public.institutions, CACHE_TAGS.public.seo,
      ],
    },
  )();
}

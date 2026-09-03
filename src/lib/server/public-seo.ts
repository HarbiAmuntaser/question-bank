import "server-only";

import type { Prisma, SeoOwnerType } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { stripPrefix } from "@/lib/public/slug-utils";
import {
  isPublicMajorId,
  isPublicQuizId,
  isPublicSubjectId,
  isPublicUniversityId,
} from "@/lib/server/public-content-visibility";

const publicSeoMetaSelect = {
  id: true,
  ownerId: true,
  slug: true,
  locale: true,
  metaTitle: true,
  metaDescription: true,
  ogTitle: true,
  ogDescription: true,
  ogImageUrl: true,
  canonicalUrl: true,
  noindex: true,
  nofollow: true,
  schemaJson: true,
} satisfies Prisma.SeoMetaSelect;

export type PublicSeoMeta = Prisma.SeoMetaGetPayload<{
  select: typeof publicSeoMetaSelect;
}>;

type PublicSeoOwnerType = Extract<SeoOwnerType, "university" | "major" | "subject" | "exam">;

type NormalizedSeoSlug = {
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

function normalizeSeoSlug(raw: string | string[], prefix?: string): NormalizedSeoSlug {
  const parts = (Array.isArray(raw) ? raw : raw.split("/"))
    .map((part) => safeDecode(String(part)).trim())
    .filter(Boolean);
  const slugPath = parts.join("/").replace(/^\/+|\/+$/g, "");
  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = prefix ? stripPrefix(slugPath, prefix) : slugPath;
  const noPrefixNoLeading = prefix ? stripPrefix(noLeadingSlash, prefix) : noLeadingSlash;
  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefixNoLeading].map((value) => value.trim()).filter(Boolean)),
  );
  const last = parts[parts.length - 1] ?? slugPath;

  return { slugPath, variants, last };
}

async function isPublicSeoOwner(ownerType: PublicSeoOwnerType, ownerId: string) {
  if (ownerType === "university") return isPublicUniversityId(ownerId);
  if (ownerType === "major") return isPublicMajorId(ownerId);
  if (ownerType === "subject") return isPublicSubjectId(ownerId);
  return isPublicQuizId(ownerId);
}

function ownerCacheTags(ownerType: PublicSeoOwnerType) {
  if (ownerType === "university") {
    return ["student-university-detail", CACHE_TAGS.public.institutions];
  }
  if (ownerType === "major") {
    return ["student-major-detail", CACHE_TAGS.public.majors];
  }
  if (ownerType === "subject") {
    return ["student-subject-detail", CACHE_TAGS.public.subjects];
  }
  return ["student-quiz-preview", CACHE_TAGS.public.quizzes];
}

const getPublicSeoBySlugCached = (
  ownerType: PublicSeoOwnerType,
  input: NormalizedSeoSlug,
  allowSuffixMatch: boolean,
) =>
  unstable_cache(
    async () => {
      const direct = await prisma.seoMeta.findFirst({
        where: { ownerType, locale: "ar", slug: { in: input.variants } },
        select: publicSeoMetaSelect,
      });
      const seo =
        direct ??
        (allowSuffixMatch && input.last
          ? await prisma.seoMeta.findFirst({
              where: { ownerType, locale: "ar", slug: { endsWith: input.last } },
              select: publicSeoMetaSelect,
            })
          : null);

      if (!seo || !(await isPublicSeoOwner(ownerType, seo.ownerId))) return null;
      return seo;
    },
    [
      "student-public-seo-by-slug",
      ownerType,
      input.slugPath,
      allowSuffixMatch ? "suffix" : "exact",
      getPublicVisibilityCacheKey(),
    ],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: [CACHE_TAGS.public.seo, ...ownerCacheTags(ownerType)],
    },
  )();

export function getPublicUniversitySeoBySlug(raw: string | string[]) {
  const input = normalizeSeoSlug(raw, "جامعات");
  return input.slugPath ? getPublicSeoBySlugCached("university", input, false) : Promise.resolve(null);
}

export function getPublicMajorSeoBySlug(raw: string | string[]) {
  const input = normalizeSeoSlug(raw);
  return input.slugPath ? getPublicSeoBySlugCached("major", input, false) : Promise.resolve(null);
}

export function getPublicSubjectSeoBySlug(raw: string | string[]) {
  const input = normalizeSeoSlug(raw, "مواد");
  return input.slugPath ? getPublicSeoBySlugCached("subject", input, true) : Promise.resolve(null);
}

export function getPublicQuizSeoBySlug(raw: string | string[]) {
  const input = normalizeSeoSlug(raw);
  return input.slugPath ? getPublicSeoBySlugCached("exam", input, false) : Promise.resolve(null);
}

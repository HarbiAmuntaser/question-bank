/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";
import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { publicUniversityWhere } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] | string };
type RouteContext = {
  params: Promise<RouteParams>;
};

function toArray(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function stripUniversitiesPrefix(input: string) {
  return input.replace(/^جامعات\s*\/\s*/u, "");
}

function normalizeSlugParts(parts: string[]) {
  const cleanParts = (parts ?? [])
    .map((p) => safeDecode(String(p)).trim())
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
        .map((x) => (x ?? "").trim())
        .filter(Boolean)
    )
  );

  return { slugPath, variants, last };
}

async function findUniversityIdByAny(_slugPath: string, variants: string[], last: string) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "university", locale: "ar", slug: { in: variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const ends = await prisma.seoMeta.findFirst({
    where: { ownerType: "university", locale: "ar", slug: { endsWith: last } },
    select: { ownerId: true },
  });
  return ends?.ownerId ?? null;
}

const getUniversityDetailsCached = (id: string) =>
  unstable_cache(
    async () => {
      const university = await prisma.university.findFirst({
        where: { id, isActive: true, AND: [publicUniversityWhere()] },
        select: {
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
        },
      });

      if (!university) return null;

      const quizzesCount = await prisma.quiz.count({
        where: {
          isActive: true,
          subject: { major: { universityId: university.id } },
        },
      });

      const seo = await prisma.seoMeta.findFirst({
        where: { ownerType: "university", ownerId: university.id, locale: "ar" },
        select: { slug: true },
      });

      return {
        ...university,
        countryCode: university.countryCode ?? null,
        institutionType: university.institutionType ?? null,
        seo: { slug: seo?.slug ?? null },
        _count: { majors: university.majors.length, quizzes: quizzesCount },
      };
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
    }
  )();

export async function GET(_req: Request, { params }: RouteContext) {
  const rawParams = await params;
  const slugArr = toArray(rawParams?.slug);

  const { slugPath, variants, last } = normalizeSlugParts(slugArr);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const uniId = await findUniversityIdByAny(slugPath, variants, last);
    if (!uniId) return bad("not_found", undefined, 404);

    const data = await getUniversityDetailsCached(uniId);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_university_by_slug");
  }
}

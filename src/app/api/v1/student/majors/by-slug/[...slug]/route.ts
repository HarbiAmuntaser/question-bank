// file: src/app/api/v1/student/majors/by-slug/[...slug]/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

function normalizeSlug(parts: string[]) {
  const clean = (parts ?? [])
    .map((p) => decodeURIComponent(p).trim())
    .filter(Boolean);

  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;

  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = slugPath.replace(/^تخصصات\s*\/\s*/u, "");

  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean))
  );

  return { slugPath, variants, last };
}

async function findMajorIdByAny(slugPath: string, variants: string[], last: string) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "major", locale: "ar", slug: { in: variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const ends = await prisma.seoMeta.findFirst({
    where: { ownerType: "major", locale: "ar", slug: { endsWith: last } },
    select: { ownerId: true },
  });
  return ends?.ownerId ?? null;
}

const getMajorDetailsCached = (id: string) =>
  unstable_cache(
    async () => {
      const major = await prisma.major.findUnique({
        where: { id, isActive: true },
        include: {
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
        },
      });

      if (!major) return null;

      const majorSeo = await prisma.seoMeta.findFirst({
        where: { ownerType: "major", ownerId: major.id, locale: "ar" },
        select: { slug: true },
      });

      const uniSeo = await prisma.seoMeta.findFirst({
        where: { ownerType: "university", ownerId: major.university.id, locale: "ar" },
        select: { slug: true },
      });

      const quizzesCount = await prisma.quiz.count({
        where: { isActive: true, subject: { majorId: major.id } },
      });

      return {
        ...major,
        seo: { slug: majorSeo?.slug ?? null },
        university: { ...major.university, seo: { slug: uniSeo?.slug ?? null } },
        _count: { ...major._count, quizzes: quizzesCount },
      };
    },
    ["student-major-detail-by-id", id],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: ["student-majors", "student-major-detail", CACHE_TAGS.public.majors, CACHE_TAGS.public.major(id)],
    }
  )();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string[] | string }> }
) {
  // ✅ Next 15: لازم await
  const { slug } = await ctx.params;

  const slugArr = Array.isArray(slug) ? slug : typeof slug === "string" ? [slug] : [];
  const { slugPath, variants, last } = normalizeSlug(slugArr);

  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const majorId = await findMajorIdByAny(slugPath, variants, last);
    if (!majorId) return bad("not_found", undefined, 404);

    const data = await getMajorDetailsCached(majorId);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_major_by_slug");
  }
}

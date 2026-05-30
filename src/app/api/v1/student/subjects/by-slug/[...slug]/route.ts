import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

function normalizeSlug(parts: string[]) {
  const clean = (parts ?? []).map((p) => decodeURIComponent(p).trim()).filter(Boolean);
  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;

  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = slugPath.replace(/^مواد\//, "");

  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean))
  );

  return { slugPath, variants, last };
}

async function findSubjectIdByAny(variants: string[], last: string) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "subject", locale: "ar", slug: { in: variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const ends = await prisma.seoMeta.findFirst({
    where: { ownerType: "subject", locale: "ar", slug: { endsWith: last } },
    select: { ownerId: true },
  });
  return ends?.ownerId ?? null;
}

const getSubjectDetailsCached = (id: string) =>
  unstable_cache(
    async () => {
      const subject = await prisma.subject.findUnique({
        where: { id, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          creditHours: true,
          semester: true,
          year: true,
          description: true,
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
                },
              },
            },
          },
        },
      });

      if (!subject) return null;

      const [subSeo, majorSeo, uniSeo, quizzesCount] = await Promise.all([
        prisma.seoMeta.findFirst({
          where: { ownerType: "subject", ownerId: subject.id, locale: "ar" },
          select: { slug: true },
        }),
        prisma.seoMeta.findFirst({
          where: { ownerType: "major", ownerId: subject.major.id, locale: "ar" },
          select: { slug: true },
        }),
        prisma.seoMeta.findFirst({
          where: { ownerType: "university", ownerId: subject.major.university.id, locale: "ar" },
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
        seo: { slug: subSeo?.slug ?? null },
        major: {
          ...subject.major,
          seo: { slug: majorSeo?.slug ?? null },
          university: {
            ...subject.major.university,
            seo: { slug: uniSeo?.slug ?? null },
          },
        },
        _count: { ...subject._count, quizzes: quizzesCount },
      };
    },
    ["student-subject-detail-by-id", id],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: ["student-subjects", "student-subject-detail", CACHE_TAGS.public.subjects, CACHE_TAGS.public.subject(id)],
    }
  )();

export async function GET(_req: Request, ctx: { params: any }) {
  const params = await (ctx as any).params; // ✅ Next 15

  const slugAny = params?.slug;
  const slugArr = Array.isArray(slugAny) ? slugAny : typeof slugAny === "string" ? [slugAny] : [];

  const { slugPath, variants, last } = normalizeSlug(slugArr);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const subjectId = await findSubjectIdByAny(variants, last);
    if (!subjectId) return bad("not_found", undefined, 404);

    const data = await getSubjectDetailsCached(subjectId);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({ "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicLong) });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subject_by_slug");
  }
}

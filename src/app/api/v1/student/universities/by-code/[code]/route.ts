import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

function normalizeCodeVariants(raw: string) {
  const clean = decodeURIComponent(raw || "").trim();
  const variants = Array.from(
    new Set([clean, clean.toUpperCase(), clean.toLowerCase()].filter(Boolean))
  );
  return { clean, variants };
}

const getUniversityByCodeCached = (code: string, variants: string[]) =>
  unstable_cache(
    async () => {
      const university = await prisma.university.findFirst({
        where: {
          isActive: true,
          OR: variants.map((v) => ({ code: v })),
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          region: true,
          logoUrl: true,

          // ✅ جديد (مهم للمسارات الجديدة /{cc}/{type})
          countryCode: true,
          institutionType: true,

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
              // seo: { select: { slug: true } }, // اختياري لو عندك علاقة seo على Major
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
        seo: { slug: seo?.slug ?? null },
        _count: {
          majors: university.majors.length,
          quizzes: quizzesCount,
        },
      };
    },
    // ✅ keyParts ثابتة (نضيف code النظيفة فقط كثابت)
    ["student-university-detail-by-code", code],
    { revalidate: 600, tags: ["student-universities", "student-university-detail"] }
  )();

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  if (!rawCode) return bad("missing_code", undefined, 400);

  const { clean, variants } = normalizeCodeVariants(rawCode);
  if (!clean) return bad("missing_code", undefined, 400);

  try {
    const data = await getUniversityByCodeCached(clean, variants);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": "public, s-maxage=600, stale-while-revalidate=60",
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_university_by_code");
  }
}

/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

// نبني دالة تُعيد دالة الكاش (نمرر id ضمن المفتاح)
const getMajorDetailsCached = (id: string) =>
  unstable_cache(
    async () => {
      // 1) جلب التخصص + الجامعة + المواد
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
          _count: { select: { subjects: true } }, // ✅ لا يوجد quizzes ضمن _count
        },
      });

      if (!major) return null;

      // 2) SEO للتخصص
      const majorSeo = await prisma.seoMeta.findFirst({
        where: { ownerType: "major", ownerId: major.id, locale: "ar" },
        select: { slug: true },
      });

      // 3) SEO للجامعة
      const uniSeo = await prisma.seoMeta.findFirst({
        where: {
          ownerType: "university",
          ownerId: major.university.id,
          locale: "ar",
        },
        select: { slug: true },
      });

      // 4) عدد الاختبارات للتخصص (إن كانت علاقتها عبر subject.majorId)
      const quizzesCount = await prisma.quiz.count({
        where: { isActive: true, subject: { majorId: major.id } },
      });

      return {
        ...major,
        seo: { slug: majorSeo?.slug ?? null },
        university: {
          ...major.university,
          seo: { slug: uniSeo?.slug ?? null },
        },
        _count: {
          ...major._count,
          quizzes: quizzesCount, // ✅ نضيفها يدويًّا
        },
      };
    },
    ["student-major-detail-by-id", id],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: ["student-majors", "student-major-detail", CACHE_TAGS.public.majors, CACHE_TAGS.public.major(id)],
    }
  )();

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!id) return bad("missing_id", undefined, 400);

  try {
    const data = await getMajorDetailsCached(id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_major_by_id");
  }
}

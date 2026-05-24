/* Fixed Next 15 params typing */

// src/app/api/v1/student/universities/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

const getUniversityDetailsCached = unstable_cache(
  async (id: string) => {
    // الجامعة + التخصصات + عدّ المواد لكل تخصص
    const university = await prisma.university.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        region: true,
        logoUrl: true,
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

    // عدّ الاختبارات المرتبطة بمواد نفس الجامعة (اختياري للاستفادة لاحقاً)
    const quizzesCount = await prisma.quiz.count({
      where: { isActive: true, subject: { major: { universityId: university.id } } },
    });

    return {
      ...university,
      _count: {
        majors: university.majors.length,
        quizzes: quizzesCount,
      },
    };
  },
  ["student-university-detail"],
  { revalidate: 600, tags: ["student-universities", "student-university-detail"] }
);

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) return bad("missing_id", undefined, 400);

  try {
    const data = await getUniversityDetailsCached(id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": "public, s-maxage=600, stale-while-revalidate=60",
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_university");
  }
}

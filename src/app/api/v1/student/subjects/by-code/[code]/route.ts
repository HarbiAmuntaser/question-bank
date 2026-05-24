import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

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
    { revalidate: 600, tags: ["student-subjects", "student-subject-detail"] }
  )();

export async function GET(
  _req: Request,
  ctx: { params: any }
) {
  const params = await (ctx as any).params; // ✅ Next 15
  const codeRaw = params?.code;

  const code =
    typeof codeRaw === "string"
      ? codeRaw.trim()
      : Array.isArray(codeRaw)
      ? (codeRaw[0] ?? "").trim()
      : "";

  if (!code) return bad("missing_code", undefined, 400);

  try {
    const subject = await prisma.subject.findFirst({
      where: { isActive: true, code },
      select: { id: true },
    });
    if (!subject) return bad("not_found", undefined, 404);

    const data = await getSubjectDetailsCached(subject.id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({ "cache-control": "public, s-maxage=600, stale-while-revalidate=60" });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subject_by_code");
  }
}

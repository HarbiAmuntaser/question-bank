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

const getPreviewCached = (id: string) =>
  unstable_cache(
    async () => {
      const quiz = await prisma.quiz.findFirst({
        where: { id, isActive: true },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          totalQuestions: true,
          totalPoints: true,
          createdAt: true,
          accessType: true,
          isFreePreview: true,
          _count: { select: { questions: true } },

          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  degreeType: true,
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
                },
              },
            },
          },

          questions: {
            take: 1,
            select: {
              question: {
                select: {
                  chapter: {
                    select: {
                      subject: {
                        select: {
                          id: true,
                          name: true,
                          code: true,
                          major: {
                            select: {
                              id: true,
                              name: true,
                              code: true,
                              degreeType: true,
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
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!quiz) return null;

      const subjectViaQuiz = quiz.subject ?? null;
      const subjectViaQuestion = quiz.questions?.[0]?.question?.chapter?.subject ?? null;

      const effectiveSubject = subjectViaQuiz || subjectViaQuestion || null;
      const effectiveMajor = effectiveSubject?.major || null;
      const effectiveUniversity = effectiveMajor?.university || null;

      if (!effectiveSubject || !effectiveMajor || !effectiveUniversity) return null;

      const [uniSeo, majorSeo, subjectSeo, quizSeo] = await Promise.all([
        prisma.seoMeta.findFirst({
          where: { ownerType: "university", ownerId: effectiveUniversity.id, locale: "ar" },
          select: { slug: true },
        }),
        prisma.seoMeta.findFirst({
          where: { ownerType: "major", ownerId: effectiveMajor.id, locale: "ar" },
          select: { slug: true },
        }),
        prisma.seoMeta.findFirst({
          where: { ownerType: "subject", ownerId: effectiveSubject.id, locale: "ar" },
          select: { slug: true },
        }),
        prisma.seoMeta.findFirst({
          where: { ownerType: "exam", ownerId: quiz.id, locale: "ar" },
          select: { slug: true },
        }),
      ]);

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        totalQuestions: quiz.totalQuestions ?? quiz._count?.questions ?? 0,
        totalPoints: quiz.totalPoints ?? 0,
        createdAt: quiz.createdAt,
        accessType: quiz.accessType,
        isFreePreview: quiz.isFreePreview,
        seo: { slug: quizSeo?.slug ?? null },
        context: {
          university: {
            ...effectiveUniversity,
            seo: { slug: uniSeo?.slug ?? null },
          },
          major: {
            ...effectiveMajor,
            seo: { slug: majorSeo?.slug ?? null },
          },
          subject: {
            ...effectiveSubject,
            seo: { slug: subjectSeo?.slug ?? null },
          },
        },
      };
    },
    ["student-quiz-preview-by-id", id],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: ["student-quizzes", "student-quiz-preview", CACHE_TAGS.public.quizzes, CACHE_TAGS.public.quiz(id)],
    }
  )();

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = rawId?.trim();

  if (!id) return bad("missing_id", undefined, 400);

  try {
    const data = await getPreviewCached(id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_preview_by_id", undefined, 500);
  }
}

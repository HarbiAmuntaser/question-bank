/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = rawId?.trim();

  if (!id) return bad("missing_id", undefined, 400);

  try {
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
        updatedAt: true,
        isActive: true,
        subjectId: true,

        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            creditHours: true,
            semester: true,
            year: true,
            description: true,
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
                  },
                },
              },
            },
          },
        },

        questions: {
          orderBy: { questionOrder: "asc" },
          select: {
            questionOrder: true,
            points: true,
            question: {
              select: {
                id: true,
                chapterId: true,
                questionText: true,
                questionType: true,
                difficultyLevel: true,
                points: true,
                explanation: true,
                imageUrl: true,
                tags: true,
                isActive: true,
                options: {
                  orderBy: { optionOrder: "asc" },
                  select: { id: true, optionText: true, isCorrect: true, optionOrder: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) return bad("not_found", undefined, 404);

    const questions = (quiz.questions || [])
      .map((row) => row.question)
      .filter((q) => q?.isActive)
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        difficultyLevel: q.difficultyLevel,
        points: q.points,
        explanation: q.explanation ?? null,
        imageUrl: q.imageUrl,
        tags: q.tags ?? [],
        options: q.options,
      }));

    const totalPoints =
      typeof quiz.totalPoints === "number" && quiz.totalPoints > 0
        ? quiz.totalPoints
        : questions.reduce((s, q) => s + (q.points || 0), 0);

    let effectiveSubject = quiz.subject;

    if (!effectiveSubject) {
      const firstChapterId = (quiz.questions?.[0]?.question?.chapterId as string | null) ?? null;
      if (firstChapterId) {
        const ch = await prisma.chapter.findUnique({
          where: { id: firstChapterId },
          select: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                creditHours: true,
                semester: true,
                year: true,
                description: true,
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
                      },
                    },
                  },
                },
              },
            },
          },
        });
        effectiveSubject = ch?.subject ?? null;
      }
    }

    if (!effectiveSubject?.major?.university) {
      return bad("missing_context", undefined, 400);
    }

    const [uniSeo, majorSeo, subjectSeo] = await Promise.all([
      prisma.seoMeta.findFirst({
        where: { ownerType: "university", ownerId: effectiveSubject.major.university.id, locale: "ar" },
        select: { slug: true },
      }),
      prisma.seoMeta.findFirst({
        where: { ownerType: "major", ownerId: effectiveSubject.major.id, locale: "ar" },
        select: { slug: true },
      }),
      prisma.seoMeta.findFirst({
        where: { ownerType: "subject", ownerId: effectiveSubject.id, locale: "ar" },
        select: { slug: true },
      }),
    ]);

    const data = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      totalQuestions: quiz.totalQuestions,
      totalPoints,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      isActive: true,
      questions,

      context: {
        university: {
          ...effectiveSubject.major.university,
          seo: { slug: uniSeo?.slug ?? null },
        },
        major: {
          ...effectiveSubject.major,
          seo: { slug: majorSeo?.slug ?? null },
        },
        subject: {
          ...effectiveSubject,
          seo: { slug: subjectSeo?.slug ?? null },
        },
      },
    };

    const headers = new Headers({
      "cache-control": "public, s-maxage=300, stale-while-revalidate=60",
    });

    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_context", undefined, 500);
  }
}
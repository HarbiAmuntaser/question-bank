/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import { checkQuizAccess } from "@/lib/server/access-control";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = rawId?.trim();
  const privateHeaders = new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
  });

  if (!id) return json({ error: "missing_id" }, { status: 400, headers: privateHeaders });

  try {
    const { session } = await getOrCreateAnonymousSession();
    const access = await checkQuizAccess({ quizId: id, anonymousSessionId: session.id });
    if (access.reason === "not_found") return json({ error: "not_found" }, { status: 404, headers: privateHeaders });
    if (!access.allowed) {
      return json({ error: "paid_access_required", details: access }, { status: 403, headers: privateHeaders });
    }

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
                    visibility: true,
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

    if (!quiz) return json({ error: "not_found" }, { status: 404, headers: privateHeaders });

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
                        visibility: true,
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
      return json({ error: "missing_context" }, { status: 400, headers: privateHeaders });
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

    return json({ data }, { status: 200, headers: privateHeaders });
  } catch {
    return json({ error: "failed_to_load_quiz_context" }, { status: 500, headers: privateHeaders });
  }
}

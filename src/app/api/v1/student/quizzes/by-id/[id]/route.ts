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
        totalPoints: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        questions: {
          orderBy: { questionOrder: "asc" },
          select: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                difficultyLevel: true,
                points: true,
                imageUrl: true,
                tags: true,
                explanation: true,
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

    const questions = quiz.questions
      .map((row) => row.question)
      .filter((q) => q?.isActive)
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        difficultyLevel: q.difficultyLevel,
        points: q.points,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        tags: q.tags ?? [],
        options: q.options,
      }));

    const totalPoints =
      typeof quiz.totalPoints === "number" && quiz.totalPoints > 0
        ? quiz.totalPoints
        : questions.reduce((s, q) => s + (q.points || 0), 0);

    const normalized = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      totalPoints,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      isActive: true,
      questions,
    };

    return json({ data: normalized }, { status: 200, headers: privateHeaders });
  } catch {
    return json({ error: "failed_to_load_quiz_by_id" }, { status: 500, headers: privateHeaders });
  }
}

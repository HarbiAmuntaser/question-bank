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

    if (!quiz) return bad("not_found", undefined, 404);

    const questions = quiz.questions
      .map((row) => row.question)
      .filter((q) => q?.isActive)
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        difficultyLevel: q.difficultyLevel,
        points: q.points,
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

    const headers = new Headers({
      "cache-control": "public, s-maxage=300, stale-while-revalidate=60",
    });
    return json({ data: normalized }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_by_id", undefined, 500);
  }
}
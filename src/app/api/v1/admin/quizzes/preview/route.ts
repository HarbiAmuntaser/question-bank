import type { Prisma } from "@prisma/client";

import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { bad, json } from "@/lib/server/admin-http";
import { quizGenerationSettingsSchema } from "@/validations/quiz";

export const dynamic = "force-dynamic";

const MAX_PREVIEW_QUESTIONS = 100;

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "quizzes:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const body = await req.json().catch(() => null);
  const parsed = quizGenerationSettingsSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const settings = parsed.data;
  const chapterIds = Array.from(new Set(settings.selectedChapters));
  if (chapterIds.length !== settings.selectedChapters.length) return bad("duplicate_chapter_ids");

  const chapterCount = await prisma.chapter.count({ where: { id: { in: chapterIds } } });
  if (chapterCount !== chapterIds.length) return bad("invalid_chapter_selection");

  const where: Prisma.QuestionWhereInput = {
    chapterId: { in: chapterIds },
    isActive: true,
    ...(settings.difficulty !== "mixed" ? { difficultyLevel: settings.difficulty } : {}),
    ...(settings.questionTypes.length ? { questionType: { in: settings.questionTypes } } : {}),
  };
  const requestedCount = settings.questionCount > 0 ? settings.questionCount : MAX_PREVIEW_QUESTIONS;
  const previewCount = Math.min(requestedCount, MAX_PREVIEW_QUESTIONS);

  const [totalAvailable, rows] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      take: previewCount,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
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
          select: {
            id: true,
            questionId: true,
            optionText: true,
            isCorrect: true,
            optionOrder: true,
          },
        },
        chapter: {
          select: {
            id: true,
            name: true,
            chapterNumber: true,
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
  ]);

  const questions = settings.randomize ? shuffleInPlace([...rows]) : rows;
  const stats = {
    totalAvailable,
    selectedCount: questions.length,
    previewLimited: totalAvailable > questions.length,
    byDifficulty: {
      easy: questions.filter((question) => question.difficultyLevel === "easy").length,
      medium: questions.filter((question) => question.difficultyLevel === "medium").length,
      hard: questions.filter((question) => question.difficultyLevel === "hard").length,
    },
    byType: {
      multiple_choice: questions.filter((question) => question.questionType === "multiple_choice").length,
      true_false: questions.filter((question) => question.questionType === "true_false").length,
      short_answer: questions.filter((question) => question.questionType === "short_answer").length,
      essay: questions.filter((question) => question.questionType === "essay").length,
    },
    totalPoints: questions.reduce((sum, question) => sum + question.points, 0),
  };

  return json(
    { data: { questions, stats } },
    { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } },
  );
}

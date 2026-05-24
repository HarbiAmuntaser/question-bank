// src/app/api/v1/admin/quizzes/preview/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { quizGenerationSettingsSchema } from "@/validations/quiz";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = quizGenerationSettingsSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const s = parsed.data;

  const where: any = {
    chapterId: { in: s.selectedChapters },
    isActive: true,
  };
  if (s.difficulty !== "mixed") where.difficultyLevel = s.difficulty;
  if (s.questionTypes?.length) where.questionType = { in: s.questionTypes };

  let questions = await prisma.question.findMany({
    where,
    include: {
      options: { orderBy: { optionOrder: "asc" } },
      chapter: {
        include: {
          subject: {
            include: {
              major: { include: { university: true } },
            },
          },
        },
      },
    },
  });

  if (s.randomize) questions = questions.sort(() => Math.random() - 0.5);

  // ✅ 0 = خذ كل المتاح
  if (s.questionCount > 0) {
    questions = questions.slice(0, s.questionCount);
  }

  const totalAvailable = await prisma.question.count({ where });

  const stats = {
    totalAvailable,
    selectedCount: questions.length,
    byDifficulty: {
      easy: questions.filter((q) => q.difficultyLevel === "easy").length,
      medium: questions.filter((q) => q.difficultyLevel === "medium").length,
      hard: questions.filter((q) => q.difficultyLevel === "hard").length,
    },
    byType: {
      multiple_choice: questions.filter((q) => q.questionType === "multiple_choice").length,
      true_false: questions.filter((q) => q.questionType === "true_false").length,
      short_answer: questions.filter((q) => q.questionType === "short_answer").length,
      essay: questions.filter((q) => q.questionType === "essay").length,
    },
    totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
  };

  return json({ data: { questions, stats } }, { status: 200 });
}

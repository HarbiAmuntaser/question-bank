// src/app/api/v1/student/quizzes/grade/route.ts
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import { checkQuizAccess } from "@/lib/server/access-control";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/student/quizzes/grade
 * body: {
 *   quizId: string,
 *   answers: Record<string, {
 *     questionId: string;
 *     selectedOptionIds?: string[];
 *     booleanAnswer?: boolean;
 *     textAnswer?: string;
 *     answeredAt?: string;
 *   }>
 * }
 */
export async function POST(req: Request) {
  const privateHeaders = new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
  });

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.quizId || !body.answers) {
      return json({ error: "invalid_payload" }, { status: 400, headers: privateHeaders });
    }

    const quizId: string = body.quizId;
    const { session } = await getOrCreateAnonymousSession();
    const access = await checkQuizAccess({ quizId, anonymousSessionId: session.id });
    if (access.reason === "not_found") return json({ error: "not_found" }, { status: 404, headers: privateHeaders });
    if (!access.allowed) {
      return json({ error: "paid_access_required", details: access }, { status: 403, headers: privateHeaders });
    }

    const answers: Record<
      string,
      { questionId: string; selectedOptionIds?: string[]; booleanAnswer?: boolean; textAnswer?: string }
    > = body.answers;

    // 1) جلب أسئلة الاختبار وإجاباتها الصحيحة
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        totalPoints: true,
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
                options: {
                  orderBy: { optionOrder: "asc" },
                  select: { id: true, optionText: true, isCorrect: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) return json({ error: "not_found" }, { status: 404, headers: privateHeaders });

    // 2) التصحيح
    let correctAnswers = 0;
    let earnedPoints = 0;

    for (const qwrap of quiz.questions) {
      const q = qwrap.question;
      const a = answers[q.id];
      if (!a) continue;

      let isCorrect = false;

      if (q.questionType === "multiple_choice") {
        const correctOption = q.options.find((o) => o.isCorrect);
        const picked = a.selectedOptionIds?.[0];
        isCorrect = !!picked && picked === correctOption?.id;
      } else if (q.questionType === "true_false") {
        const correctOption = q.options.find((o) => o.isCorrect);
        // ندعم كلا اللغتين لو مخزّنة نصًا
        const correctVal =
          String(correctOption?.optionText).toLowerCase() === "true" ||
          correctOption?.optionText === "صحيح";
        isCorrect = a.booleanAnswer === correctVal;
      } else if (q.questionType === "short_answer" || q.questionType === "essay") {
        // مؤقتًا: نعدّها صحيحة إذا هناك نص (تقييم يدوي لاحقًا)
        isCorrect = !!a.textAnswer && a.textAnswer.trim().length > 0;
      }

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += q.points;
      }
    }

    const totalQuestions = quiz.questions.length;
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const grade = (p: number) => {
      if (p >= 90) return "ممتاز";
      if (p >= 80) return "جيد جداً";
      if (p >= 70) return "جيد";
      if (p >= 60) return "مقبول";
      return "راسب";
    };

    const result = {
      quizId: quiz.id,
      correctAnswers,
      totalQuestions,
      earnedPoints,
      totalPoints: quiz.totalPoints,
      percentage,
      grade: grade(percentage),
      completedAt: new Date().toISOString(),
    };

    return json({ data: result }, { status: 200, headers: privateHeaders });
  } catch {
    return json({ error: "failed_to_grade_quiz" }, { status: 500, headers: privateHeaders });
  }
}

// src/app/api/v1/student/quizzes/grade/route.ts
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import { checkQuizAccess } from "@/lib/server/access-control";
import { isPublicQuizId } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

type GradeAnswerInput = {
  questionId: string;
  selectedOptionIds?: string[];
  booleanAnswer?: boolean;
  textAnswer?: string;
  timeSpent?: number;
  duration?: number;
  durationSec?: number;
};

type GradeRequestBody = {
  quizId?: string;
  answers?: Record<string, GradeAnswerInput>;
  timeSpent?: number;
  duration?: number;
  durationSec?: number;
};

function toNonNegativeInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function pickTimeSpentSeconds(...values: unknown[]): number | null {
  for (const value of values) {
    const normalized = toNonNegativeInt(value);
    if (normalized != null) return normalized;
  }
  return null;
}

function answerTextFromInput(answer: GradeAnswerInput): string | null {
  if (typeof answer.textAnswer === "string" && answer.textAnswer.trim().length > 0) {
    return answer.textAnswer;
  }

  if (typeof answer.booleanAnswer === "boolean") {
    return answer.booleanAnswer ? "true" : "false";
  }

  return null;
}

function gradeLabel(percentage: number): string {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جداً";
  if (percentage >= 70) return "جيد";
  if (percentage >= 60) return "مقبول";
  return "راسب";
}

export async function POST(req: Request) {
  const privateHeaders = new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
  });

  try {
    const body = (await req.json().catch(() => null)) as GradeRequestBody | null;
    if (
      !body ||
      !body.quizId ||
      !body.answers ||
      typeof body.answers !== "object" ||
      Array.isArray(body.answers)
    ) {
      return json({ error: "invalid_payload" }, { status: 400, headers: privateHeaders });
    }

    const quizId = body.quizId;
    const answers = body.answers;
    const timeSpent = pickTimeSpentSeconds(body.timeSpent, body.durationSec, body.duration);

    if (!(await isPublicQuizId(quizId))) {
      return json({ error: "not_found" }, { status: 404, headers: privateHeaders });
    }

    const { session } = await getOrCreateAnonymousSession();
    const access = await checkQuizAccess({ quizId, anonymousSessionId: session.id });
    if (access.reason === "not_found") return json({ error: "not_found" }, { status: 404, headers: privateHeaders });
    if (!access.allowed) {
      return json({ error: "paid_access_required", details: access }, { status: 403, headers: privateHeaders });
    }

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

    let correctAnswers = 0;
    let earnedPoints = 0;
    const userAnswers: {
      questionId: string;
      selectedOptionId: string | null;
      answerText: string | null;
      isCorrect: boolean;
      timeSpent: number | null;
    }[] = [];

    for (const qwrap of quiz.questions) {
      const q = qwrap.question;
      const answer = answers[q.id];
      if (!answer) continue;

      let isCorrect = false;
      let selectedOptionId: string | null = null;

      if (q.questionType === "multiple_choice") {
        const correctOption = q.options.find((option) => option.isCorrect);
        const picked = Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds[0] : undefined;
        selectedOptionId = picked && q.options.some((option) => option.id === picked) ? picked : null;
        isCorrect = !!picked && picked === correctOption?.id;
      } else if (q.questionType === "true_false") {
        const correctOption = q.options.find((option) => option.isCorrect);
        const correctVal =
          String(correctOption?.optionText).toLowerCase() === "true" || correctOption?.optionText === "صحيح";
        isCorrect = answer.booleanAnswer === correctVal;
      } else if (q.questionType === "short_answer" || q.questionType === "essay") {
        isCorrect = typeof answer.textAnswer === "string" && answer.textAnswer.trim().length > 0;
      }

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += q.points;
      }

      userAnswers.push({
        questionId: q.id,
        selectedOptionId,
        answerText: answerTextFromInput(answer),
        isCorrect,
        timeSpent: pickTimeSpentSeconds(answer.timeSpent, answer.durationSec, answer.duration),
      });
    }

    const totalQuestions = quiz.questions.length;
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const completedAt = new Date();

    const result = {
      quizId: quiz.id,
      correctAnswers,
      totalQuestions,
      earnedPoints,
      totalPoints: quiz.totalPoints,
      percentage,
      grade: gradeLabel(percentage),
      completedAt: completedAt.toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          sessionId: session.id,
          quizId: quiz.id,
          totalQuestions,
          correctAnswers,
          score: percentage,
          timeSpent,
          completedAt,
          isCompleted: true,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
          userAgent: req.headers.get("user-agent") || null,
        },
        select: {
          id: true,
        },
      });

      if (userAnswers.length === 0) return;

      await tx.userAnswer.createMany({
        data: userAnswers.map((answer) => ({
          quizAttemptId: attempt.id,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent,
        })),
      });
    });

    return json({ data: result }, { status: 200, headers: privateHeaders });
  } catch (error) {
    console.error("failed_to_grade_quiz", error);
    return json({ error: "failed_to_grade_quiz" }, { status: 500, headers: privateHeaders });
  }
}

import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateQuestionCache, revalidateQuizCache } from "@/lib/cache-invalidation";
import { updateQuestionSchema } from "@/validations/question";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await params;

  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      chapter: {
        include: {
          subject: {
            include: {
              major: {
                include: {
                  university: true,
                },
              },
            },
          },
        },
      },
      options: { orderBy: { optionOrder: "asc" } },
    },
  });

  if (!q) return notFound("السؤال غير موجود");

  return json(
    { data: q },
    { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } }
  );
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body: unknown = await req.json().catch(() => null);
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const exists = await prisma.question.findUnique({ where: { id } });
  if (!exists) return notFound("السؤال غير موجود");

  const d = parsed.data;

  const incomingType = typeof d.questionType !== "undefined" ? d.questionType : exists.questionType;

  const replaceOptions =
    typeof d.options !== "undefined" ||
    incomingType === "multiple_choice" ||
    incomingType === "true_false";

  if (replaceOptions) {
    await prisma.questionOption.deleteMany({ where: { questionId: id } });
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      chapterId: typeof d.chapterId !== "undefined" ? d.chapterId : undefined,
      questionText: typeof d.questionText !== "undefined" ? d.questionText : undefined,
      questionType: typeof d.questionType !== "undefined" ? d.questionType : undefined,
      difficultyLevel: typeof d.difficultyLevel !== "undefined" ? d.difficultyLevel : undefined,
      points: typeof d.points !== "undefined" ? d.points : undefined,
      explanation: Object.prototype.hasOwnProperty.call(d, "explanation") ? d.explanation ?? null : undefined,
      imageUrl: Object.prototype.hasOwnProperty.call(d, "imageUrl") ? d.imageUrl ?? null : undefined,
      tags: typeof d.tags !== "undefined" ? d.tags : undefined,
      isActive: typeof d.isActive !== "undefined" ? d.isActive : undefined,
      options:
        d.options?.length
          ? {
              create: d.options.map((o, idx) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                optionOrder: o.optionOrder ?? idx + 1,
              })),
            }
          : undefined,
    },
    include: { options: true },
  });

  const affectedChapters = await prisma.chapter.findMany({
    where: { id: { in: Array.from(new Set([exists.chapterId, updated.chapterId])) } },
    select: { id: true, subjectId: true },
  });
  const previousChapter = affectedChapters.find((chapter) => chapter.id === exists.chapterId);
  const nextChapter = affectedChapters.find((chapter) => chapter.id === updated.chapterId);
  revalidateQuestionCache({
    chapterId: updated.chapterId,
    previousChapterId: exists.chapterId,
    subjectId: nextChapter?.subjectId,
    previousSubjectId: previousChapter?.subjectId,
  });
  return json({ data: updated }, { status: 200 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const target = await prisma.question.findUnique({
    where: { id },
    select: {
      chapter: { select: { id: true, subjectId: true } },
      _count: { select: { userAnswers: true } },
    },
  });

  if (!target) return notFound("السؤال غير موجود");

  if (target._count.userAnswers > 0) {
    return bad(
      "لا يمكن حذف السؤال لأنه مرتبط بإجابات طلاب محفوظة. يمكنك تعطيل السؤال بدلًا من حذفه.",
      { code: "question_has_answers", userAnswersCount: target._count.userAnswers },
      409
    );
  }

  try {
    const affectedQuizzes = await prisma.$transaction(async (tx) => {
      const quizLinks = await tx.quizQuestion.findMany({
        where: { questionId: id },
        select: { quizId: true, quiz: { select: { subjectId: true } } },
      });

      await tx.quizQuestion.deleteMany({ where: { questionId: id } });
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      await tx.question.delete({ where: { id } });

      const uniqueQuizIds = Array.from(new Set(quizLinks.map((link) => link.quizId)));
      for (const quizId of uniqueQuizIds) {
        const stats = await tx.quizQuestion.aggregate({
          where: { quizId },
          _count: { _all: true },
          _sum: { points: true },
        });

        await tx.quiz.update({
          where: { id: quizId },
          data: {
            totalQuestions: stats._count._all,
            totalPoints: stats._sum.points ?? 0,
          },
        });
      }

      return uniqueQuizIds.map((quizId) => ({
        id: quizId,
        subjectId: quizLinks.find((link) => link.quizId === quizId)?.quiz.subjectId ?? null,
      }));
    });

    revalidateQuestionCache({ chapterId: target.chapter?.id, subjectId: target.chapter?.subjectId });
    for (const quiz of affectedQuizzes) {
      revalidateQuizCache({ id: quiz.id, subjectId: quiz.subjectId });
    }
  } catch {
    return bad("تعذر حذف السؤال مؤقتًا. حاول مرة أخرى.", undefined, 500);
  }

  return json({ data: true, message: "تم حذف السؤال بنجاح" }, { status: 200 });
}

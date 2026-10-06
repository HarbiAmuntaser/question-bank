// src/app/admin/quiz-generator/actions.ts
"use server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";

export type QuizGeneratorChapter = {
  id: string;
  name: string;
  chapterNumber: number | null;
  activeQuestionCount: number;
};

export async function searchQuizGeneratorChaptersAction(args: {
  subjectId: string;
  query?: string;
}): Promise<QuizGeneratorChapter[]> {
  await requireAdminPermission("quizzes:read");
  if (!args.subjectId) return [];

  const query = args.query?.trim();
  const chapters = await prisma.chapter.findMany({
    where: {
      subjectId: args.subjectId,
      isActive: true,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: [{ chapterNumber: "asc" }, { name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      chapterNumber: true,
      _count: { select: { questions: { where: { isActive: true } } } },
    },
  });

  return chapters.map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    chapterNumber: chapter.chapterNumber,
    activeQuestionCount: chapter._count.questions,
  }));
}

export interface QuizGenerationSettings {
  title: string;
  questionCount: number; // 0 يعني خذ كل المتاح (مدعوم في الراوت)
  timeLimit: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  questionTypes?: ("multiple_choice" | "true_false" | "short_answer" | "essay")[]; // اختيارية
  randomize: boolean;
  selectedChapters: string[];
  accessType?: "inherit" | "free" | "paid";
  isFreePreview?: boolean;
}

export async function generateQuizAction(settings: QuizGenerationSettings) {
  await requireAdminPermission("quizzes:write");

  try {
    const res = await apiFetch("/api/v1/admin/quizzes", {
      method: "POST",
      body: JSON.stringify(settings),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false as const, message: data?.message ?? "فشل في إنشاء الاختبار" };
    }
    return { success: true as const, message: data?.message ?? "تم إنشاء الاختبار", quiz: data?.data };
  } catch {
    return { success: false as const, message: "خطأ اتصال بالخادم" };
  }
}

export async function getQuizPreviewAction(settings: QuizGenerationSettings) {
  await requireAdminPermission("quizzes:read");

  try {
    const res = await apiFetch("/api/v1/admin/quizzes/preview", {
      method: "POST",
      body: JSON.stringify(settings),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false as const, message: data?.message ?? "فشل في جلب المعاينة" };
    }

    // ✅ يدعم: { data: { questions, stats } } أو { questions, stats }
    const questions =
      data?.data?.questions ??
      data?.questions ??
      data?.data?.data?.questions ?? // احتياط لو صار nesting إضافي
      [];

    const stats =
      data?.data?.stats ??
      data?.stats ??
      data?.data?.data?.stats ??
      null;

    return { success: true as const, questions, stats };
  } catch {
    return { success: false as const, message: "خطأ اتصال بالخادم" };
  }
}


export async function exportQuizAction(
  settings: QuizGenerationSettings,
  format: "json" | "pdf" | "word" = "json",
) {
  await requireAdminPermission("quizzes:read");

  try {
    const res = await apiFetch("/api/v1/admin/quizzes/preview", {
      method: "POST",
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false as const, message: data?.message ?? "فشل في التصدير" };

    const payload = data?.data ?? data;
    return {
      success: true as const,
      message: "تم تجهيز ملف التصدير",
      data: {
        exportedAt: new Date().toISOString(),
        settings,
        questions: payload?.questions ?? [],
        stats: payload?.stats ?? null,
      },
      filename: data?.filename ?? `quiz-${Date.now()}.${format}`,
    };
  } catch {
    return { success: false as const, message: "خطأ اتصال بالخادم" };
  }
}

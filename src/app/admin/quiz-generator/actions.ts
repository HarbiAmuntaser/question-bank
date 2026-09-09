// src/app/admin/quiz-generator/actions.ts
"use server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";

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
    const res = await apiFetch(`/api/v1/admin/quizzes/export?format=${format}`, {
      method: "POST",
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false as const, message: data?.message ?? "فشل في التصدير" };

    return {
      success: true as const,
      message: data?.message ?? "تم التصدير",
      data: data?.data,
      filename: data?.filename ?? `quiz-${Date.now()}.${format}`,
    };
  } catch {
    return { success: false as const, message: "خطأ اتصال بالخادم" };
  }
}

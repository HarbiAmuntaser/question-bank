// src/app/admin/questions/actions.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

function apiBase() {
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (envBase) return envBase.replace(/\/$/, "");
  return "http://localhost:3000";
}

async function apiFetch(path: string, init?: RequestInit) {
  const base = apiBase();
  const jar = await cookies();
  const cookieHeader = jar.toString();

  const headers = new Headers(init?.headers);

  if (cookieHeader) headers.set("cookie", cookieHeader);
  if (process.env.ADMIN_API_KEY) headers.set("x-admin-key", process.env.ADMIN_API_KEY);

  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  return fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

function toBool(v: FormDataEntryValue | null, fallback = false) {
  if (v == null) return fallback;
  const s = String(v).toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}

function extractOptions(formData: FormData) {
  // يدعم option1..optionN بدون حد
  const entries = Array.from(formData.entries());
  const options = entries
    .map(([k, val]) => {
      const m = /^option(\d+)$/.exec(k);
      if (!m) return null;
      const idx = Number(m[1]);
      const text = String(val || "").trim();
      if (!text) return null;
      const isCorrect = toBool(formData.get(`correct${idx}`));
      return { idx, optionText: text, isCorrect };
    })
    .filter(Boolean) as Array<{ idx: number; optionText: string; isCorrect: boolean }>;

  options.sort((a, b) => a.idx - b.idx);

  return options.map((o, i) => ({
    optionText: o.optionText,
    isCorrect: o.isCorrect,
    optionOrder: o.idx || i + 1,
  }));
}

export async function getChaptersAction() {
  try {
    const qs = new URLSearchParams({
      page: "1",
      pageSize: "1000",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const res = await apiFetch(`/api/v1/admin/chapters?${qs.toString()}`, { method: "GET" });
    if (!res.ok) return { data: [] };

    const payload = await res.json().catch(() => ({}));
    return payload ?? { data: [] };
  } catch (e) {
    console.error("Error fetching chapters:", e);
    return { data: [] };
  }
}

export async function createQuestionAction(formData: FormData) {
  try {
    const questionType = String(formData.get("questionType") || "multiple_choice");

    const tagsRaw = String(formData.get("tags") || "");
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const options =
      questionType === "multiple_choice" || questionType === "true_false"
        ? extractOptions(formData)
        : [];

    const payload = {
      chapterId: String(formData.get("chapterId") || ""),
      questionText: String(formData.get("questionText") || ""),
      questionType,
      difficultyLevel: String(formData.get("difficultyLevel") || "medium"),
      points: Number.parseInt(String(formData.get("points") || "1"), 10) || 1,
      explanation: String(formData.get("explanation") || "").trim() || null,
      imageUrl: String(formData.get("imageUrl") || "").trim() || null,
      tags,
      isActive: toBool(formData.get("isActive"), true),
      options,
    };

    const res = await apiFetch("/api/v1/admin/questions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false as const, message: data?.message ?? data?.error ?? "فشل إنشاء السؤال" };
    }

    revalidateTag("questions");
    revalidatePath("/admin/questions");
    return { success: true as const, message: "تم إنشاء السؤال بنجاح" };
  } catch (error) {
    console.error("Error creating question:", error);
    return { success: false as const, message: "حدث خطأ أثناء إنشاء السؤال" };
  }
}

export async function updateQuestionAction(id: string, formData: FormData) {
  try {
    const questionType = String(formData.get("questionType") || "multiple_choice");

    const tagsRaw = String(formData.get("tags") || "");
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const options =
      questionType === "multiple_choice" || questionType === "true_false"
        ? extractOptions(formData)
        : [];

    const payload = {
      chapterId: String(formData.get("chapterId") || ""),
      questionText: String(formData.get("questionText") || ""),
      questionType,
      difficultyLevel: String(formData.get("difficultyLevel") || "medium"),
      points: Number.parseInt(String(formData.get("points") || "1"), 10) || 1,
      explanation: String(formData.get("explanation") || "").trim() || null,
      imageUrl: String(formData.get("imageUrl") || "").trim() || null,
      tags,
      isActive: toBool(formData.get("isActive"), true),
      options,
    };

    const res = await apiFetch(`/api/v1/admin/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false as const, message: data?.message ?? data?.error ?? "فشل تحديث السؤال" };
    }

    revalidateTag("questions");
    revalidatePath("/admin/questions");
    return { success: true as const, message: "تم تحديث السؤال بنجاح" };
  } catch (error) {
    console.error("Error updating question:", error);
    return { success: false as const, message: "حدث خطأ أثناء تحديث السؤال" };
  }
}

export async function deleteQuestionAction(id: string) {
  try {
    const res = await apiFetch(`/api/v1/admin/questions/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false as const, message: data?.message ?? data?.error ?? "فشل في حذف السؤال" };
    }

    revalidateTag("questions");
    revalidatePath("/admin/questions");
    return { success: true as const, message: "تم حذف السؤال بنجاح" };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false as const, message: "فشل في حذف السؤال." };
  }
}

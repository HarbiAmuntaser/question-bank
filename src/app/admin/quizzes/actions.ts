"use server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";

export async function fetchQuizzesList(params: {
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "title" | "totalQuestions" | "timeLimit";
  sortOrder?: "asc" | "desc";
  universityId?: string;
  majorId?: string;
  subjectId?: string;
}) {
  await requireAdminPermission("quizzes:read");

  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortOrder) sp.set("sortOrder", params.sortOrder);
  if (params.universityId) sp.set("universityId", params.universityId);
  if (params.majorId) sp.set("majorId", params.majorId);
  if (params.subjectId) sp.set("subjectId", params.subjectId);

  const res = await apiFetch(`/api/v1/admin/quizzes?${sp.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحميل الاختبارات" };
  return { success: true, ...data };
}

export async function getQuizzesSimpleAction() {
  await requireAdminPermission("quizzes:read");

  const result = await fetchQuizzesList({ page: 1, pageSize: 50 });
  if (!result.success) return result;
  return { success: true, quizzes: result.data ?? [] };
}

export async function fetchQuizById(id: string) {
  await requireAdminPermission("quizzes:read");

  const res = await apiFetch(`/api/v1/admin/quizzes/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحميل الاختبار" };
  return { success: true, quiz: data?.data };
}

export async function updateQuizAction(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    timeLimit?: number;
    isActive?: boolean;
    accessType?: "inherit" | "free" | "paid";
    isFreePreview?: boolean;
  },
) {
  await requireAdminPermission("quizzes:write");

  const res = await apiFetch(`/api/v1/admin/quizzes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحديث الاختبار" };
  return { success: true, message: data?.message ?? "تم التحديث", quiz: data?.data };
}

export async function deleteQuizAction(id: string) {
  await requireAdminPermission("quizzes:write");

  const res = await apiFetch(`/api/v1/admin/quizzes/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل حذف الاختبار" };
  return { success: true, message: data?.message ?? "تم الحذف" };
}

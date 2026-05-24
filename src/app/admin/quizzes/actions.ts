"use server";

import { cookies } from "next/headers";

function apiBase() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function apiFetch(path: string, init?: RequestInit) {
  const base = apiBase();
  const jar = await cookies();
  const cookieHeader = jar.toString();

  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  headers.set("cookie", cookieHeader);
  if (process.env.ADMIN_API_KEY) headers.set("x-admin-key", process.env.ADMIN_API_KEY);

  const res = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
  return res;
}

export async function fetchQuizzesList(params: {
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "title" | "totalQuestions" | "timeLimit";
  sortOrder?: "asc" | "desc";
  universityId?: string;
  majorId?: string;
  subjectId?: string;
}) {
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
  const result = await fetchQuizzesList({ page: 1, pageSize: 50 });
  if (!result.success) return result;
  return { success: true, quizzes: result.data ?? [] };
}

export async function fetchQuizById(id: string) {
  const res = await apiFetch(`/api/v1/admin/quizzes/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحميل الاختبار" };
  return { success: true, quiz: data?.data };
}

export async function updateQuizAction(id: string, payload: { title?: string; description?: string | null; timeLimit?: number; isActive?: boolean; }) {
  const res = await apiFetch(`/api/v1/admin/quizzes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحديث الاختبار" };
  return { success: true, message: data?.message ?? "تم التحديث", quiz: data?.data };
}

export async function deleteQuizAction(id: string) {
  const res = await apiFetch(`/api/v1/admin/quizzes/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل حذف الاختبار" };
  return { success: true, message: data?.message ?? "تم الحذف" };
}

// src/app/admin/exams/actions.ts
"use server";

import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/server/request-origin";

export type ExamTerm = "first" | "second" | "summer";
export type ExamSession = "regular" | "makeup" | "special";
export type ContentLanguage = "ar" | "en";

export type ExamPaperInput = {
  subjectId: string;
  year: number;
  term: ExamTerm;
  session: ExamSession;
  code?: string | null;
  source?: string | null;
  fileUrl?: string | null;
  pagesCount?: number | null;
  isPublished: boolean;
  language: ContentLanguage;
};

export type ExamQuestionPayload = {
  examPaperId: string;
  questionId: string;
  questionNumber: number;
  page?: number | null;
  points?: number | null;
};

async function apiFetch(path: string, init?: RequestInit) {
  const base = await getRequestOrigin();
  const jar = await cookies();
  const cookieHeader = jar.toString();

  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  headers.set("cookie", cookieHeader);
  if (process.env.ADMIN_API_KEY) headers.set("x-admin-key", process.env.ADMIN_API_KEY);

  const res = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
  return res;
}

// قائمة (مع فلاتر اختيارية وترقيم)
export async function listExamsAction(args: {
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "year" | "term" | "session";
  sortOrder?: "asc" | "desc";
  universityId?: string;
  majorId?: string;
  subjectId?: string;
}) {
  const p = new URLSearchParams();
  p.set("page", String(args.page ?? 1));
  p.set("pageSize", String(args.pageSize ?? 10));
  p.set("sortBy", String(args.sortBy ?? "createdAt"));
  p.set("sortOrder", String(args.sortOrder ?? "desc"));
  if (args.universityId) p.set("universityId", args.universityId);
  if (args.majorId) p.set("majorId", args.majorId);
  if (args.subjectId) p.set("subjectId", args.subjectId);

  const res = await apiFetch(`/api/v1/admin/exams?${p.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحميل أوراق الاختبارات" };
  return { success: true, ...data };
}

// تفاصيل
export async function getExamByIdAction(id: string) {
  const res = await apiFetch(`/api/v1/admin/exams/${id}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحميل تفاصيل الورقة" };
  return { success: true, data: data?.data };
}

// إنشاء
export async function createExamAction(payload: ExamPaperInput) {
  const res = await apiFetch(`/api/v1/admin/exams`, { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل في إنشاء الورقة" };
  return { success: true, message: data?.message ?? "تم الإنشاء", data: data?.data };
}

// تعديل
export async function updateExamAction(id: string, payload: Partial<ExamPaperInput>) {
  const res = await apiFetch(`/api/v1/admin/exams/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل في التعديل" };
  return { success: true, message: data?.message ?? "تم التعديل", data: data?.data };
}

// حذف
export async function deleteExamAction(id: string) {
  const res = await apiFetch(`/api/v1/admin/exams/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل في الحذف" };
  return { success: true, message: data?.message ?? "تم الحذف" };
}
// Exam questions management
export async function createExamQuestionAction(payload: ExamQuestionPayload) {
  const res = await apiFetch(`/api/v1/admin/exam-questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "�?�?�? �?�? �?�?�?�?�?�?�? �?�?�?�?�?�?�?" };
  return { success: true, message: data?.message ?? "�?�? �?�?�?�?�? �?�?�?�?�?�?�?�? �?�?�?�?�?", data: data?.data };
}

export async function updateExamQuestionAction(
  id: string,
  payload: Partial<Omit<ExamQuestionPayload, "examPaperId">> & { questionId?: string }
) {
  const res = await apiFetch(`/api/v1/admin/exam-questions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "�?�?�? �?�? �?�?�?�?� �?�?�?�?�?�?�?" };
  return { success: true, message: data?.message ?? "�?�? �?�?�?�?� �?�?�?�?�?�?�?�? �?�?�?�?�?", data: data?.data };
}

export async function deleteExamQuestionAction(id: string) {
  const res = await apiFetch(`/api/v1/admin/exam-questions/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "�?�?�? �?�? �?�?�?�?�?�?�?�? �?�?�?�?�?�?�?" };
  return { success: true, message: data?.message ?? "�?�? �?�?�?�?�?�?�?�? �?�?�?�?�?" };
}

export async function deleteAttachmentAction(id: string) {
  const res = await apiFetch(`/api/v1/admin/attachments/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل حذف المرفق" };
  return { success: true, message: data?.message ?? "تم حذف المرفق" };
}

"use server";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/server/request-origin";

async function apiFetch(path: string, init?: RequestInit) {
  const base = await getRequestOrigin();
  const jar = await cookies();
  const cookieHeader = jar.toString();

  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  headers.set("cookie", cookieHeader);
  if (process.env.ADMIN_API_KEY) headers.set("x-admin-key", process.env.ADMIN_API_KEY);

  return fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
}

export async function listUsersAction() {
  const res = await apiFetch("/api/v1/admin/users");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل جلب المستخدمين" };
  return { success: true, users: data?.data ?? [] };
}

export async function createUserAction(payload: {
  name?: string | null;
  email: string;
  password: string;
  role: "admin" | "editor" | "moderator";
  isActive: boolean;
}) {
  const res = await apiFetch("/api/v1/admin/users", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل إنشاء المستخدم" };
  return { success: true, message: data?.message ?? "تم الإنشاء", user: data?.data };
}

export async function updateUserAction(id: string, payload: {
  name?: string | null;
  email?: string;
  password?: string;
  role?: "admin" | "editor" | "moderator";
  isActive?: boolean;
}) {
  const res = await apiFetch(`/api/v1/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل تحديث المستخدم" };
  return { success: true, message: data?.message ?? "تم التحديث", user: data?.data };
}

export async function deleteUserAction(id: string) {
  const res = await apiFetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: data?.message ?? "فشل حذف المستخدم" };
  return { success: true, message: data?.message ?? "تم الحذف" };
}

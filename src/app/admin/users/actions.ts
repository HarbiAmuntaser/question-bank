"use server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";

function userError(data: { error?: string; message?: string }, fallback: string) {
  const messages: Record<string, string> = {
    last_active_admin: "لا يمكن تعطيل أو حذف أو تغيير دور آخر مسؤول نشط.",
    cannot_remove_own_admin_access: "لا يمكنك حذف حسابك أو تعطيله أو تخفيض صلاحياتك.",
    user_change_conflict: "تغيرت بيانات المستخدم أثناء العملية. حدّث الصفحة وحاول مجددًا.",
    forbidden: "لا تملك صلاحية تنفيذ هذه العملية.",
    unauthorized: "انتهت الجلسة. سجّل الدخول مجددًا.",
    email_exists: "البريد الإلكتروني مستخدم بالفعل.",
    not_found: "المستخدم غير موجود.",
  };
  return messages[data.error ?? ""] ?? data.message ?? fallback;
}

export async function listUsersAction() {
  await requireAdminPermission("users:manage");

  const res = await apiFetch("/api/v1/admin/users");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: userError(data, "فشل جلب المستخدمين") };
  return { success: true, users: data?.data ?? [] };
}

export async function createUserAction(payload: {
  name?: string | null;
  email: string;
  password: string;
  role: "admin" | "editor" | "moderator";
  isActive: boolean;
}) {
  await requireAdminPermission("users:manage");

  const res = await apiFetch("/api/v1/admin/users", { method: "POST", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: userError(data, "فشل إنشاء المستخدم") };
  return { success: true, message: data?.message ?? "تم الإنشاء", user: data?.data };
}

export async function updateUserAction(id: string, payload: {
  name?: string | null;
  email?: string;
  password?: string;
  role?: "admin" | "editor" | "moderator";
  isActive?: boolean;
}) {
  await requireAdminPermission("users:manage");

  const res = await apiFetch(`/api/v1/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: userError(data, "فشل تحديث المستخدم") };
  return { success: true, message: data?.message ?? "تم التحديث", user: data?.data };
}

export async function deleteUserAction(id: string) {
  await requireAdminPermission("users:manage");

  const res = await apiFetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: userError(data, "فشل حذف المستخدم") };
  return { success: true, message: data?.message ?? "تم الحذف" };
}

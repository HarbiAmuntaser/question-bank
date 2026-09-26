"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";

type ActionResult = { success: true; message: string } | { success: false; message: string };

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function resultMessage(response: Response, fallback: string): Promise<ActionResult> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, message: body?.error ?? fallback };
  return { success: true, message: fallback };
}

export async function createCollegeAction(formData: FormData): Promise<ActionResult> {
  await requireAdminPermission("colleges:write");

  const response = await apiFetch("/api/v1/admin/colleges", {
    method: "POST",
    body: JSON.stringify({
      universityId: value(formData, "universityId"),
      name: value(formData, "name"),
      slug: value(formData, "slug"),
      code: value(formData, "code") || null,
      isActive: formData.get("isActive") === "on",
    }),
  });
  const result = await resultMessage(response, response.ok ? "تم إنشاء الكلية بنجاح" : "فشل إنشاء الكلية");
  if (result.success) {
    revalidateTag("colleges");
    revalidatePath("/admin/colleges");
  }
  return result;
}

export async function updateCollegeAction(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdminPermission("colleges:write");

  const response = await apiFetch(`/api/v1/admin/colleges/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      universityId: value(formData, "universityId"),
      name: value(formData, "name"),
      slug: value(formData, "slug"),
      code: value(formData, "code") || null,
      isActive: formData.get("isActive") === "on",
    }),
  });
  const result = await resultMessage(response, response.ok ? "تم تحديث الكلية بنجاح" : "فشل تحديث الكلية");
  if (result.success) {
    revalidateTag("colleges");
    revalidatePath("/admin/colleges");
  }
  return result;
}

export async function deleteCollegeAction(id: string): Promise<ActionResult> {
  await requireAdminPermission("colleges:write");

  const response = await apiFetch(`/api/v1/admin/colleges/${id}`, { method: "DELETE" });
  const result = await resultMessage(response, response.ok ? "تم حذف الكلية بنجاح" : "فشل حذف الكلية");
  if (result.success) {
    revalidateTag("colleges");
    revalidatePath("/admin/colleges");
  }
  return result;
}

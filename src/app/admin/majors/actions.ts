// src/app/admin/majors/actions.ts
"use server";

import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";
import { revalidatePath, revalidateTag } from "next/cache";

import { normalizeDegreeType } from "@/lib/degree-types";

function normalize(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function createMajorAction(formData: FormData) {
  await requireAdminPermission("majors:write");

  const payload = {
    universityId: (formData.get("universityId") ?? "").toString(),
    name: (formData.get("name") ?? "").toString().trim(),
    code: normalize(formData.get("code")),            // "" => null
    degreeType: normalizeDegreeType(formData.get("degreeType")),
    durationYears: (() => {
      const raw = (formData.get("durationYears") ?? "").toString().trim();
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    })(),
    isActive: (formData.get("isActive") ?? "") === "on" || formData.get("isActive") === "true",
  };

  try {
    const res = await apiFetch(`/api/v1/admin/majors`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false as const, message: err?.error ?? "validation_error" };
    }

    revalidateTag("majors");
    revalidatePath("/admin/majors");
    return { success: true as const, message: "تم إنشاء التخصص بنجاح" };
  } catch {
    return { success: false as const, message: "خطأ غير متوقع" };
  }
}

export async function updateMajorAction(id: string, formData: FormData) {
  await requireAdminPermission("majors:write");

  const payload = {
    universityId: normalize(formData.get("universityId")) ?? undefined,
    name: normalize(formData.get("name")) ?? undefined,
    code: normalize(formData.get("code")),            // قد تصبح null
    degreeType: normalizeDegreeType(formData.get("degreeType")),
    durationYears: (() => {
      const raw = (formData.get("durationYears") ?? "").toString().trim();
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    })(),
    isActive:
      formData.get("isActive") === null
        ? undefined
        : (formData.get("isActive") ?? "") === "on" || formData.get("isActive") === "true",
  };

  try {
    const res = await apiFetch(`/api/v1/admin/majors/${id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false as const, message: err?.error ?? "validation_error" };
    }

    revalidateTag("majors");
    revalidatePath("/admin/majors");
    return { success: true as const, message: "تم تحديث التخصص بنجاح" };
  } catch {
    return { success: false as const, message: "خطأ غير متوقع" };
  }
}

export async function deleteMajorAction(id: string) {
  await requireAdminPermission("majors:write");

  try {
    const res = await apiFetch(`/api/v1/admin/majors/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false as const, message: err?.error ?? "delete_failed" };
    }
    revalidateTag("majors");
    revalidatePath("/admin/majors");
    return { success: true as const, message: "تم حذف التخصص بنجاح" };
  } catch {
    return { success: false as const, message: "خطأ غير متوقع" };
  }
}

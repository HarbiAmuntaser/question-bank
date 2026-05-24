// src/app/admin/majors/actions.ts
"use server";

import { headers as nextHeaders, } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";

function normalize(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

async function getBase(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = await nextHeaders();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function createMajorAction(formData: FormData) {
  const payload = {
    universityId: (formData.get("universityId") ?? "").toString(),
    name: (formData.get("name") ?? "").toString().trim(),
    code: normalize(formData.get("code")),            // "" => null
    degreeType: normalize(formData.get("degreeType")),// "" => null
    durationYears: (() => {
      const raw = (formData.get("durationYears") ?? "").toString().trim();
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    })(),
    isActive: (formData.get("isActive") ?? "") === "on" || formData.get("isActive") === "true",
  };

  try {
    const base = await getBase();
    const res = await fetch(`${base}/api/v1/admin/majors`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": process.env.ADMIN_API_KEY ?? "",
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
  } catch (e) {
    return { success: false as const, message: "خطأ غير متوقع" };
  }
}

export async function updateMajorAction(id: string, formData: FormData) {
  const payload = {
    universityId: normalize(formData.get("universityId")) ?? undefined,
    name: normalize(formData.get("name")) ?? undefined,
    code: normalize(formData.get("code")),            // قد تصبح null
    degreeType: normalize(formData.get("degreeType")),// قد تصبح null
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
    const base = await getBase();
    const res = await fetch(`${base}/api/v1/admin/majors/${id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-admin-key": process.env.ADMIN_API_KEY ?? "",
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
  try {
    const base = await getBase();
    const res = await fetch(`${base}/api/v1/admin/majors/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": process.env.ADMIN_API_KEY ?? "" },
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

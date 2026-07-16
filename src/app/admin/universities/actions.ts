"use server";

// file: src/app/admin/universities/actions.ts
// Server Actions تستدعي API v1 (admin) بدل الوصول المباشر لقاعدة البيانات.
// تُستخدم من مكوّنات الواجهة (الحوارات والجداول) لتنفيذ CRUD ثم إعادة تفعيل الكاش.

import { revalidatePath, revalidateTag } from "next/cache";
import { getRequestOrigin } from "@/lib/server/request-origin";

// ------- أنواع موحّدة للاستجابات -------
export type ActionResult = { success: boolean; message: string };

interface ApiResponse<T> { data: T }
interface ApiError { error: string; details?: unknown }

export interface UniversityDTO {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string | null;

  // الحقول الجديدة
  countryCode: string; // مثال: "SA"
  institutionType: "university" | "school" | "academy";
  visibility: "country" | "global";
}

export interface CreateUniversityInput {
  name: string;
  code?: string | null;
  city?: string | null;
  region?: string | null;
  isActive?: boolean;

  // إجباريتان عند الإنشاء
  countryCode: string; // ISO-3166 alpha-2 (مثال SA, YE)
  institutionType: "university" | "school" | "academy";
  visibility?: "country" | "global";
}

export interface UpdateUniversityInput {
  name?: string;
  code?: string | null;
  city?: string | null;
  region?: string | null;
  isActive?: boolean;

  // اختياريتان عند التحديث (نحدّثهما فقط إذا أُرسلا)
  countryCode?: string;
  institutionType?: "university" | "school" | "academy";
  visibility?: "country" | "global";
}

async function getApiBase(): Promise<string> {
  return getRequestOrigin();
}

function buildHeaders(): Headers {
  const h = new Headers();
  h.set("content-type", "application/json; charset=utf-8");
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) h.set("x-admin-key", adminKey);
  return h;
}

async function parseJson<T>(res: Response): Promise<T | ApiError> {
  const txt = await res.text();
  try {
    return JSON.parse(txt) as T | ApiError;
  } catch {
    return { error: "invalid_json" };
  }
}

export async function createUniversityAction(formData: FormData): Promise<ActionResult> {
  const rawCountry = String(formData.get("countryCode") ?? "").trim().toUpperCase();
  const rawType = String(formData.get("institutionType") ?? "").trim();
  const rawVisibility = String(formData.get("visibility") ?? "country").trim();

  const payload: CreateUniversityInput = {
    name: String(formData.get("name") ?? "").trim(),
    code: (formData.get("code") as string | null) ?? null,
    city: (formData.get("city") as string | null) ?? null,
    region: (formData.get("region") as string | null) ?? null,
    isActive: formData.get("isActive") === "on",

    // إجباريتان
    countryCode: rawCountry,
    institutionType: rawType as CreateUniversityInput["institutionType"],
    visibility: rawType === "academy" && rawVisibility === "global" ? "global" : "country",
  };

  if (!payload.name) return { success: false, message: "الاسم مطلوب" };
  if (!/^[A-Z]{2}$/.test(payload.countryCode))
    return { success: false, message: "رمز الدولة مطلوب بصيغة ISO-2 مثل SA" };
  if (!["university", "school", "academy"].includes(payload.institutionType))
    return { success: false, message: "نوع المؤسسة مطلوب (university | school | academy)" };

  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/universities`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await parseJson<ApiResponse<UniversityDTO>>(res);
  if (!res.ok) {
    const err = json as ApiError;
    return { success: false, message: err.error ?? "فشل إنشاء الجامعة" };
  }

  revalidateTag("universities");
  revalidatePath("/admin/universities");
  return { success: true, message: "تم إنشاء الجامعة بنجاح" };
}

export async function updateUniversityAction(id: string, formData: FormData): Promise<ActionResult> {
  // نقرأ القيم إن أُرسلت — ونتجاهل الفارغ ("") حتى لا نمسّ القيم القديمة
  const rawCountry = formData.get("countryCode");
  const rawType = formData.get("institutionType");
  const rawVisibility = formData.get("visibility");

  const payload: UpdateUniversityInput = {
    name: (String(formData.get("name") ?? "").trim() || undefined),
    code: ((formData.get("code") as string | null) ?? null),
    city: ((formData.get("city") as string | null) ?? null),
    region: ((formData.get("region") as string | null) ?? null),
    isActive: formData.get("isActive") === null ? undefined : formData.get("isActive") === "on",
  };

  // countryCode اختياري بالتحديث — إن أُرسل وغير فارغ نقوم بضبطه
  if (typeof rawCountry === "string" && rawCountry.trim().length > 0) {
    const cc = rawCountry.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) {
      return { success: false, message: "رمز الدولة يجب أن يكون بصيغة ISO-2 مثل SA" };
    }
    payload.countryCode = cc;
  }

  // institutionType اختياري بالتحديث — إن أُرسل وغير فارغ نقوم بضبطه
  if (typeof rawType === "string" && rawType.trim().length > 0) {
    const it = rawType.trim();
    if (!["university", "school", "academy"].includes(it)) {
      return { success: false, message: "نوع المؤسسة غير صالح (university | school | academy)" };
    }
    payload.institutionType = it as UpdateUniversityInput["institutionType"];
  }

  if (typeof rawVisibility === "string" && rawVisibility.trim().length > 0) {
    const visibility = rawVisibility.trim();
    if (!["country", "global"].includes(visibility)) {
      return { success: false, message: "نطاق الظهور غير صالح" };
    }
    payload.visibility = visibility as UpdateUniversityInput["visibility"];
  }

  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/universities/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await parseJson<ApiResponse<UniversityDTO>>(res);
  if (!res.ok) {
    const err = json as ApiError;
    return { success: false, message: err.error ?? "فشل تحديث الجامعة" };
  }

  revalidateTag("universities");
  revalidatePath("/admin/universities");
  return { success: true, message: "تم تحديث الجامعة بنجاح" };
}

export async function deleteUniversityAction(id: string): Promise<ActionResult> {
  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/universities/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
    cache: "no-store",
  });

  const json = await parseJson<ApiResponse<boolean>>(res);
  if (!res.ok) {
    const err = json as ApiError;
    return { success: false, message: err.error ?? "فشل حذف الجامعة" };
  }

  revalidateTag("universities");
  revalidatePath("/admin/universities");
  return { success: true, message: "تم حذف الجامعة بنجاح" };
}

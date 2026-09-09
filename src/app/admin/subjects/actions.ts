"use server";

import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { InstitutionType } from "@/config/regions";

// -------- Helpers --------
function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v !== "undefined") usp.set(k, String(v));
  });
  return usp.toString();
}

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

// -------- Types (خفيفة تكفي القوائم) --------
export interface MajorOption {
  id: string;
  name: string;
  code: string | null;
  university: { id: string; name: string; code: string | null } | null;
}

export type SubjectInstitutionContext = {
  countryCode: string;
  institutionType: InstitutionType;
};

export async function getSubjectInstitutionContextAction(
  universityId: string,
): Promise<SubjectInstitutionContext | null> {
  await requireAdminPermission("subjects:read");
  if (!universityId) return null;

  return prisma.university.findUnique({
    where: { id: universityId },
    select: { countryCode: true, institutionType: true },
  });
}

// يستعمله الحوار لملء قائمة التخصصات (اسم + جامعة)
export async function getMajorsForSubjectDialogAction(): Promise<MajorOption[]> {
  await requireAdminPermission("subjects:read");
  // Legacy helper kept bounded; new dialogs use searchable lookup comboboxes.
  const rows = await prisma.major.findMany({
    take: 50,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      university: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return rows.map((m): MajorOption => ({
    id: m.id,
    name: m.name,
    code: m.code ?? null,
    university: m.university
      ? {
          id: m.university.id,
          name: m.university.name,
          code: m.university.code ?? null,
        }
      : null,
  }));
}

// -------- Create --------
export async function createSubjectAction(formData: FormData) {
  await requireAdminPermission("subjects:write");

  const normalize = (v: FormDataEntryValue | null) =>
    typeof v === "string" ? v.trim() : "";

  const majorId = normalize(formData.get("majorId"));
  const name = normalize(formData.get("name"));
  const code = normalize(formData.get("code"));
  const creditHoursStr = normalize(formData.get("creditHours"));
  const semesterStr = normalize(formData.get("semester"));
  const yearStr = normalize(formData.get("year"));
  const description = normalize(formData.get("description"));
  const isActive = formData.get("isActive") === "on";

  const toNumOrNull = (s: string) => {
    if (!s) return null;
    const n = Number.parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
    // ملاحظة: لو أردت رفض القيم غير المعروفة، بدّل السطر السابق بإرجاع undefined / رمي خطأ
  };

  const body = {
    majorId,
    name,
    code: code || null,
    creditHours: toNumOrNull(creditHoursStr),
    semester: toNumOrNull(semesterStr),
    year: toNumOrNull(yearStr),
    description: description || null,
    isActive,
  };

  const res = await apiFetch(`/api/v1/admin/subjects`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await readJsonSafe(res);
    const message =
      payload?.message ||
      (payload?.error ? String(payload.error) : "validation_error");
    return { success: false, message };
  }

  // الـ API يقوم بـ revalidateTag("subjects")، وهنا ننعش صفحة الجدول.
  revalidatePath("/admin/subjects");
  return { success: true, message: "تم إنشاء المقرر بنجاح" };
}

// -------- Update --------
export async function updateSubjectAction(id: string, formData: FormData) {
  await requireAdminPermission("subjects:write");

  const normalize = (v: FormDataEntryValue | null) =>
    typeof v === "string" ? v.trim() : "";

  const majorId = normalize(formData.get("majorId"));
  const name = normalize(formData.get("name"));
  const code = normalize(formData.get("code"));
  const creditHoursStr = normalize(formData.get("creditHours"));
  const semesterStr = normalize(formData.get("semester"));
  const yearStr = normalize(formData.get("year"));
  const description = normalize(formData.get("description"));
  const isActive = formData.get("isActive") === "on";

  const toNumOrNull = (s: string) => {
    if (!s) return null;
    const n = Number.parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };

  // أرسل كل الحقول بشكل صريح (الـ API لديه zod schema يتحمّل null/undefined كما ضبطناه)
  const body = {
    majorId,
    name,
    code: code || null,
    creditHours: toNumOrNull(creditHoursStr),
    semester: toNumOrNull(semesterStr),
    year: toNumOrNull(yearStr),
    description: description || null,
    isActive,
  };

  const res = await apiFetch(`/api/v1/admin/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await readJsonSafe(res);
    const message =
      payload?.message ||
      (payload?.error ? String(payload.error) : "validation_error");
    return { success: false, message };
  }

  revalidatePath("/admin/subjects");
  return { success: true, message: "تم تحديث المقرر بنجاح" };
}

// -------- Delete --------
export async function deleteSubjectAction(id: string) {
  await requireAdminPermission("subjects:write");

  const res = await apiFetch(`/api/v1/admin/subjects/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const payload = await readJsonSafe(res);
    const message =
      payload?.message ||
      (payload?.error ? String(payload.error) : "delete_failed");
    return { success: false, message };
  }

  revalidatePath("/admin/subjects");
  return { success: true, message: "تم حذف المقرر بنجاح" };
}

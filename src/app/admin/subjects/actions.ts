"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/server/request-origin";
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

async function getApiBase(): Promise<string> {
  return getRequestOrigin();

}

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

function adminHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    // مفتاح الإدارة البديل لـ NextAuth
    ...(process.env.ADMIN_API_KEY ? { "x-admin-key": process.env.ADMIN_API_KEY } : {}),
  };
}

async function assertAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["admin", "editor", "moderator"].includes(role)) {
    throw new Error("unauthorized");
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
  await assertAdminSession();
  if (!universityId) return null;

  return prisma.university.findUnique({
    where: { id: universityId },
    select: { countryCode: true, institutionType: true },
  });
}

// يستعمله الحوار لملء قائمة التخصصات (اسم + جامعة)
export async function getMajorsForSubjectDialogAction(): Promise<MajorOption[]> {
  await assertAdminSession();
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
  const base = await getApiBase();

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

  const res = await fetch(`${base}/api/v1/admin/subjects`, {
    method: "POST",
    headers: adminHeaders(),
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
  const base = await getApiBase();

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

  const res = await fetch(`${base}/api/v1/admin/subjects/${id}`, {
    method: "PUT",
    headers: adminHeaders(),
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
  const base = await getApiBase();

  const res = await fetch(`${base}/api/v1/admin/subjects/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
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

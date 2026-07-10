"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getRequestOrigin } from "@/lib/server/request-origin";

type SummaryStatus = "draft" | "published" | "archived";
type SummaryLanguage = "ar" | "en";
type SummaryAccessType = "inherit" | "free" | "paid";

type SummaryPayload = {
  subjectId: string;
  chapterId: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string | null;
  contentText: string | null;
  pdfAttachmentId: string | null;
  status: SummaryStatus;
  accessType: SummaryAccessType;
  publishedAt?: string;
  language: SummaryLanguage;
  readingMinutes?: number;
  sortOrder: number;
  isFeatured: boolean;
};

type FieldErrors = Record<string, string[]>;

type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: FieldErrors;
};

const ADMIN_SUMMARIES_PATH = "/admin/summaries";

const errorMessages: Record<string, string> = {
  validation_error: "يرجى مراجعة الحقول المطلوبة.",
  bad_query_params: "معاملات الطلب غير صحيحة.",
  subject_not_found: "المادة المحددة غير موجودة.",
  chapter_not_found: "الفصل المحدد غير موجود.",
  chapter_subject_mismatch: "الفصل المحدد لا يتبع المادة المختارة.",
  pdf_attachment_not_found: "مرفق PDF المحدد غير موجود.",
  pdf_attachment_must_be_pdf: "المرفق المحدد يجب أن يكون ملف PDF.",
  pdf_attachment_owner_mismatch: "مرفق PDF لا يتبع المادة أو الفصل أو الملخص الحالي.",
  duplicate_study_summary_slug: "يوجد ملخص بنفس الرابط داخل نفس المادة واللغة.",
  study_summary_content_required: "يجب إدخال محتوى HTML أو نص الملخص أو معرف مرفق PDF.",
  failed_to_create_study_summary: "فشل إنشاء الملخص.",
  failed_to_update_study_summary: "فشل تحديث الملخص.",
  invalid_study_summary_relation: "توجد علاقة غير صحيحة في بيانات الملخص.",
  study_summary_not_found: "الملخص غير موجود.",
};

function adminHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    ...(process.env.ADMIN_API_KEY ? { "x-admin-key": process.env.ADMIN_API_KEY } : {}),
  };
}

function normalize(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string) {
  return value.length ? value : null;
}

function optionalNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function summaryPayload(formData: FormData): SummaryPayload {
  const status = normalize(formData.get("status"));
  const language = normalize(formData.get("language"));
  const accessType = normalize(formData.get("accessType"));

  return {
    subjectId: normalize(formData.get("subjectId")),
    chapterId: nullable(normalize(formData.get("chapterId"))),
    title: normalize(formData.get("title")),
    slug: slugify(normalize(formData.get("slug"))),
    excerpt: nullable(normalize(formData.get("excerpt"))),
    contentHtml: nullable(normalize(formData.get("contentHtml"))),
    contentText: nullable(normalize(formData.get("contentText"))),
    pdfAttachmentId: nullable(normalize(formData.get("pdfAttachmentId"))),
    status: status === "published" || status === "archived" ? status : "draft",
    accessType: accessType === "free" || accessType === "paid" ? accessType : "inherit",
    publishedAt: normalize(formData.get("publishedAt")) || undefined,
    language: language === "en" ? "en" : "ar",
    readingMinutes: optionalNumber(normalize(formData.get("readingMinutes"))),
    sortOrder: optionalNumber(normalize(formData.get("sortOrder"))) ?? 0,
    isFeatured: ["true", "on", "1"].includes(normalize(formData.get("isFeatured")).toLowerCase()),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function extractFieldErrors(payload: unknown): FieldErrors | undefined {
  if (!isRecord(payload) || !isRecord(payload.details)) return undefined;

  const { fieldErrors } = payload.details;
  if (!isRecord(fieldErrors)) return undefined;

  const normalized: FieldErrors = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (!Array.isArray(messages)) continue;
    const textMessages = messages.filter((message): message is string => typeof message === "string" && message.length > 0);
    if (textMessages.length > 0) normalized[field] = textMessages;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

async function readError(res: Response, fallback: string): Promise<{ message: string; fieldErrors?: FieldErrors }> {
  const text = await res.text().catch(() => "");
  if (!text) return { message: fallback };

  try {
    const payload: unknown = JSON.parse(text);
    if (payload && typeof payload === "object" && "error" in payload) {
      const code = String((payload as { error: unknown }).error);
      return {
        message: errorMessages[code] ?? code,
        fieldErrors: extractFieldErrors(payload),
      };
    }
  } catch {
    return { message: text };
  }

  return { message: fallback };
}

async function sendJson(path: string, method: "POST" | "PATCH", body: unknown) {
  const base = await getRequestOrigin();
  const jar = await cookies();
  const requestHeaders = new Headers(adminHeaders());
  const cookieHeader = jar.toString();
  if (cookieHeader) requestHeaders.set("cookie", cookieHeader);

  return fetch(`${base}${path}`, {
    method,
    headers: requestHeaders,
    cache: "no-store",
    body: JSON.stringify(body),
  });
}

function success(message: string): ActionResult {
  revalidatePath(ADMIN_SUMMARIES_PATH);
  return { success: true, message };
}

export async function createStudySummaryAction(formData: FormData): Promise<ActionResult> {
  const res = await sendJson("/api/v1/admin/summaries", "POST", summaryPayload(formData));
  if (!res.ok) {
    return { success: false, ...(await readError(res, "فشل إنشاء الملخص")) };
  }
  return success("تم إنشاء الملخص بنجاح");
}

export async function updateStudySummaryAction(id: string, formData: FormData): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/summaries/${id}`, "PATCH", summaryPayload(formData));
  if (!res.ok) {
    return { success: false, ...(await readError(res, "فشل تحديث الملخص")) };
  }
  return success("تم تحديث الملخص بنجاح");
}

export async function archiveStudySummaryAction(id: string): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/summaries/${id}`, "PATCH", { status: "archived" });
  if (!res.ok) {
    return { success: false, ...(await readError(res, "فشل أرشفة الملخص")) };
  }
  return success("تمت أرشفة الملخص بنجاح");
}

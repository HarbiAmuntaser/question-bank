export type PdfViewerLoadStage = "source" | "viewer" | "document";

const sourceErrors: Record<string, string> = {
  summary_pdf_access_denied: "لا تملك صلاحية فتح هذا الملف.",
  chapter_attachment_access_denied: "يتطلب هذا الملف اشتراكًا فعالًا في المادة.",
  pdf_watermark_configuration_unavailable: "عارض الملفات المدفوعة غير متاح مؤقتًا.",
  pdf_watermark_principal_unavailable: "تعذر التحقق من هوية الوصول لهذا الملف.",
  summary_not_found: "الملخص غير موجود أو غير منشور.",
  summary_pdf_not_found: "لا يوجد ملف PDF لهذا الملخص.",
  chapter_attachment_not_found: "الملف غير موجود أو لم يعد متاحًا.",
  pdf_storage_unavailable: "تعذر الوصول إلى الملف المخزن.",
};

export class PdfViewerResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfViewerResponseError";
  }
}

export function pdfViewerSourceError(code: string | undefined, status: number) {
  if (code && sourceErrors[code]) return sourceErrors[code];
  if (status === 403) return "لا تملك صلاحية فتح هذا الملف.";
  if (status === 404) return "الملف غير موجود أو لم يعد متاحًا.";
  return "تعذر تحميل الملف. حاول مرة أخرى.";
}

export function pdfViewerLoadErrorMessage(error: unknown, stage: PdfViewerLoadStage) {
  if (error instanceof PdfViewerResponseError) return error.message;
  if (stage === "source") return "تعذر الاتصال بخدمة الملفات. تحقق من اتصالك وأعد المحاولة.";
  if (stage === "viewer") return "تعذر تشغيل عارض PDF. حدّث الصفحة أو أعد المحاولة.";
  return "تعذر تحميل ملف PDF. أعد المحاولة، وإن استمرت المشكلة تواصل مع الدعم.";
}

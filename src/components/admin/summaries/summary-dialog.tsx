"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

import { createStudySummaryAction, updateStudySummaryAction } from "@/app/admin/summaries/actions";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import type { StudySummaryAccessType, StudySummaryLanguage, StudySummaryRow, StudySummaryStatus } from "./types";

const pdfMimeType = "application/pdf";
const pdfMaxBytes = 25 * 1024 * 1024;

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "غير محدد";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function normalizePublishedAt(formData: FormData, originalPublishedAt: string | null, status: StudySummaryStatus) {
  const rawPublishedAt = formData.get("publishedAt");
  const publishedAt = typeof rawPublishedAt === "string" ? rawPublishedAt.trim() : "";

  if (publishedAt) {
    if (originalPublishedAt && publishedAt === toDateTimeLocal(originalPublishedAt)) {
      formData.set("publishedAt", originalPublishedAt);
      return;
    }

    const parsed = new Date(publishedAt);
    if (!Number.isNaN(parsed.getTime())) {
      formData.set("publishedAt", parsed.toISOString());
    }
    return;
  }

  if (status === "published") {
    formData.set("publishedAt", new Date().toISOString());
  } else {
    formData.delete("publishedAt");
  }
}

type FieldErrors = Record<string, string[]>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

export function SummaryDialog({
  summary,
  children,
  open,
  onOpenChange,
}: {
  summary?: StudySummaryRow;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<StudySummaryStatus>("draft");
  const [accessType, setAccessType] = useState<StudySummaryAccessType>("inherit");
  const [language, setLanguage] = useState<StudySummaryLanguage>("ar");
  const [isFeatured, setIsFeatured] = useState(false);
  const [pdfAttachmentId, setPdfAttachmentId] = useState("");
  const [pdfAttachment, setPdfAttachment] = useState<StudySummaryRow["pdfAttachment"]>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { toast } = useToast();
  const router = useRouter();

  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  useEffect(() => {
    if (!dialogOpen) return;
    setSelectedUniversityId(summary?.subject.major.university.id ?? "");
    setSelectedMajorId(summary?.subject.major.id ?? "");
    setSelectedSubjectId(summary?.subjectId ?? "");
    setSelectedChapterId(summary?.chapterId ?? "");
    setTitle(summary?.title ?? "");
    setSlug(summary?.slug ?? "");
    setSlugTouched(Boolean(summary));
    setStatus(summary?.status ?? "draft");
    setAccessType(summary?.accessType ?? "inherit");
    setLanguage(summary?.language ?? "ar");
    setIsFeatured(summary?.isFeatured ?? false);
    setPdfAttachmentId(summary?.pdfAttachmentId ?? "");
    setPdfAttachment(summary?.pdfAttachment ?? null);
    setFieldErrors({});
  }, [dialogOpen, summary]);

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleUniversityChange = (value: string) => {
    setSelectedUniversityId(value);
    setSelectedMajorId("");
    setSelectedSubjectId("");
    setSelectedChapterId("");
  };

  const handleMajorChange = (value: string) => {
    setSelectedMajorId(value);
    setSelectedSubjectId("");
    setSelectedChapterId("");
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubjectId(value);
    setSelectedChapterId("");
  };

  const handlePdfUpload = async (file: File | null) => {
    if (!file) return;
    if (!summary?.id) {
      toast({
        title: "احفظ الملخص أولًا",
        description: "يمكن رفع ملف PDF بعد حفظ الملخص لأول مرة.",
        variant: "destructive",
      });
      return;
    }
    if (file.type !== pdfMimeType) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يسمح فقط بملفات PDF.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > pdfMaxBytes) {
      toast({
        title: "ملف PDF كبير جدًا",
        description: "الحد الأقصى لملف PDF هو 25MB.",
        variant: "destructive",
      });
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("ownerType", "study_summary");
    uploadForm.append("ownerId", summary.id);
    uploadForm.append("kind", "pdf");
    uploadForm.append("visibility", "private");
    uploadForm.append("purpose", "summary-pdf");
    uploadForm.append("title", file.name || title || summary.title);

    setIsUploadingPdf(true);
    let uploadedAttachmentId: string | null = null;
    try {
      const uploadRes = await fetch("/api/v1/admin/attachments", {
        method: "POST",
        body: uploadForm,
        credentials: "include",
      });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      const attachment = uploadBody?.data as NonNullable<StudySummaryRow["pdfAttachment"]> | undefined;

      if (!uploadRes.ok || !attachment?.id) {
        throw new Error(uploadBody?.error || "attachment_upload_failed");
      }

      uploadedAttachmentId = attachment.id;

      const updateRes = await fetch(`/api/v1/admin/summaries/${summary.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pdfAttachmentId: attachment.id }),
      });
      const updateBody = await updateRes.json().catch(() => ({}));
      const updatedSummary = updateBody?.data as StudySummaryRow | undefined;

      if (!updateRes.ok) {
        await fetch(`/api/v1/admin/attachments/${attachment.id}`, {
          method: "DELETE",
          credentials: "include",
        }).catch(() => undefined);
        throw new Error(updateBody?.error || "summary_pdf_update_failed");
      }

      setPdfAttachmentId(attachment.id);
      setPdfAttachment(updatedSummary?.pdfAttachment ?? attachment);
      setFieldErrors((current) => ({ ...current, pdfAttachmentId: [] }));
      toast({ title: "تم رفع ملف PDF", description: "تم ربط ملف PDF الخاص بالملخص بنجاح." });
      router.refresh();
    } catch (error) {
      toast({
        title: "تعذر رفع ملف PDF",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع ملف PDF.",
        variant: "destructive",
      });
    } finally {
      if (!uploadedAttachmentId) setPdfAttachmentId(summary.pdfAttachmentId ?? "");
      setIsUploadingPdf(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setFieldErrors({});

    if (!selectedSubjectId) {
      setFieldErrors({ subjectId: ["يرجى اختيار المادة."] });
      toast({ title: "تعذر الحفظ", description: "يرجى اختيار المادة.", variant: "destructive" });
      return;
    }

    const contentHtml = String(formData.get("contentHtml") ?? "").trim();
    const contentText = String(formData.get("contentText") ?? "").trim();
    const pdfAttachmentId = String(formData.get("pdfAttachmentId") ?? "").trim();

    if (!contentHtml && !contentText && !pdfAttachmentId) {
      setFieldErrors({
        contentHtml: ["أدخل محتوى HTML أو نص الملخص أو معرف مرفق PDF."],
        contentText: ["أدخل نص الملخص إذا لم تستخدم HTML أو PDF."],
        pdfAttachmentId: ["اتركه فارغًا إذا كان الملخص يحتوي على HTML أو نص."],
      });
      toast({
        title: "تعذر الحفظ",
        description: "يجب إدخال محتوى HTML أو نص الملخص أو معرف مرفق PDF.",
        variant: "destructive",
      });
      return;
    }

    formData.set("subjectId", selectedSubjectId);
    formData.set("chapterId", selectedChapterId);
    formData.set("status", status);
    formData.set("accessType", accessType);
    formData.set("language", language);
    formData.set("isFeatured", isFeatured ? "true" : "false");
    normalizePublishedAt(formData, summary?.publishedAt ?? null, status);

    startTransition(async () => {
      const result = summary
        ? await updateStudySummaryAction(summary.id, formData)
        : await createStudySummaryAction(formData);

      if (result.success) {
        toast({ title: "تم الحفظ", description: result.message });
        setDialogOpen(false);
        router.refresh();
        return;
      }

      setFieldErrors(result.fieldErrors ?? {});
      toast({ title: "تعذر الحفظ", description: result.message, variant: "destructive" });
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>{summary ? "تعديل الملخص" : "إضافة ملخص دراسي"}</DialogTitle>
          <DialogDescription>
            اربط الملخص بمادة، ويمكن ربطه بفصل اختياري. يجب أن يحتوي الملخص على HTML أو نص أو مرفق PDF.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="subjectId" value={selectedSubjectId} />
          <input type="hidden" name="chapterId" value={selectedChapterId} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="accessType" value={accessType} />
          <input type="hidden" name="language" value={language} />
          <input type="hidden" name="isFeatured" value={isFeatured ? "true" : "false"} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>الجامعة</Label>
              <AdminLookupCombobox
                type="university"
                value={selectedUniversityId}
                onValueChange={handleUniversityChange}
                placeholder="ابحث عن جامعة"
                disablePortal
              />
              <FieldError message={fieldError("universityId")} />
            </div>

            <div className="grid gap-2">
              <Label>التخصص</Label>
              <AdminLookupCombobox
                type="major"
                value={selectedMajorId}
                onValueChange={handleMajorChange}
                universityId={selectedUniversityId}
                disabled={!selectedUniversityId}
                placeholder={selectedUniversityId ? "ابحث عن تخصص" : "اختر الجامعة أولًا"}
                disablePortal
              />
              <FieldError message={fieldError("majorId")} />
            </div>

            <div className="grid gap-2">
              <Label>المادة</Label>
              <AdminLookupCombobox
                type="subject"
                value={selectedSubjectId}
                onValueChange={handleSubjectChange}
                majorId={selectedMajorId}
                disabled={!selectedMajorId}
                placeholder={selectedMajorId ? "ابحث عن مادة" : "اختر التخصص أولًا"}
                disablePortal
              />
              <FieldError message={fieldError("subjectId")} />
            </div>

            <div className="grid gap-2">
              <Label>الفصل اختياري</Label>
              <AdminLookupCombobox
                type="chapter"
                value={selectedChapterId}
                onValueChange={setSelectedChapterId}
                subjectId={selectedSubjectId}
                disabled={!selectedSubjectId}
                placeholder={selectedSubjectId ? "ابحث عن فصل" : "اختر المادة أولًا"}
                disablePortal
              />
              <FieldError message={fieldError("chapterId")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary-title">العنوان</Label>
              <Input
                id="summary-title"
                name="title"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                className="h-11"
                aria-invalid={Boolean(fieldError("title"))}
                required
              />
              <FieldError message={fieldError("title")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary-slug">Slug</Label>
              <Input
                id="summary-slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                className="h-11 text-left"
                dir="ltr"
                aria-invalid={Boolean(fieldError("slug"))}
                required
              />
              <FieldError message={fieldError("slug")} />
            </div>

            <div className="grid gap-2">
              <Label>الحالة</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as StudySummaryStatus)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="published">منشور</SelectItem>
                  <SelectItem value="archived">مؤرشف</SelectItem>
                </SelectContent>
              </Select>
              {status === "published" ? (
                <p className="text-xs text-muted-foreground">إذا تركت تاريخ النشر فارغًا، سيملؤه الـ API تلقائيًا.</p>
              ) : null}
              <FieldError message={fieldError("status")} />
            </div>

            <div className="grid gap-2">
              <Label>سياسة الوصول</Label>
              <Select value={accessType} onValueChange={(value) => setAccessType(value as StudySummaryAccessType)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">يرث من المادة</SelectItem>
                  <SelectItem value="free">مجاني</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {accessType === "free"
                  ? "مجاني: يظهر حتى لو كانت المادة مدفوعة."
                  : accessType === "paid"
                    ? "مدفوع: يحتاج صلاحية وصول حتى لو كانت المادة مجانية."
                    : "يرث من المادة: يتبع حالة المادة أو الخطة الحالية."}
              </p>
              <FieldError message={fieldError("accessType")} />
            </div>

            <div className="grid gap-2">
              <Label>اللغة</Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as StudySummaryLanguage)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={fieldError("language")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary-publishedAt">تاريخ النشر</Label>
              <Input
                id="summary-publishedAt"
                name="publishedAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(summary?.publishedAt ?? null)}
                className="h-11"
                aria-invalid={Boolean(fieldError("publishedAt"))}
              />
              <FieldError message={fieldError("publishedAt")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary-readingMinutes">مدة القراءة بالدقائق</Label>
              <Input
                id="summary-readingMinutes"
                name="readingMinutes"
                type="number"
                min={1}
                defaultValue={summary?.readingMinutes ?? ""}
                className="h-11"
                aria-invalid={Boolean(fieldError("readingMinutes"))}
              />
              <FieldError message={fieldError("readingMinutes")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary-sortOrder">ترتيب العرض</Label>
              <Input
                id="summary-sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={summary?.sortOrder ?? 0}
                className="h-11"
                aria-invalid={Boolean(fieldError("sortOrder"))}
              />
              <FieldError message={fieldError("sortOrder")} />
            </div>

            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Label>ملف PDF للملخص</Label>
                  <p className="text-sm text-muted-foreground">
                    ملفات PDF ترفع كملفات خاصة دائمًا في هذه المرحلة، وسيتم فتحها للطلاب عبر رابط تحميل آمن لاحقًا.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              {pdfAttachment ? (
                <div className="grid gap-3 rounded-lg border bg-background p-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">
                      {pdfAttachment.originalName || pdfAttachment.title || "ملف PDF مرتبط"}
                    </p>
                    <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                      خاص private
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>الحجم: {formatBytes(pdfAttachment.sizeBytes)}</span>
                    <span>التخزين: {pdfAttachment.storageProvider}</span>
                    <span>النوع: {pdfAttachment.contentType || pdfAttachment.kind}</span>
                    <span>الحالة: {pdfAttachment.visibility}</span>
                  </div>
                  {pdfAttachment.url ? (
                    <a
                      href={pdfAttachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      فتح الرابط الحالي للأدمن
                    </a>
                  ) : (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                      هذا الملف خاص، وسيتم فتحه للطلاب المصرح لهم بعد تفعيل رابط التحميل الآمن في المرحلة التالية.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-background text-sm text-muted-foreground">
                  لا يوجد ملف PDF مرتبط بهذا الملخص.
                </div>
              )}

              {summary?.id ? (
                <div className="grid gap-2">
                  <Label htmlFor="summary-pdf-upload">رفع ملف PDF جديد</Label>
                  <Input
                    id="summary-pdf-upload"
                    type="file"
                    accept="application/pdf"
                    disabled={isUploadingPdf}
                    onChange={(event) => {
                      void handlePdfUpload(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    يسمح فقط بملفات PDF، بحد أقصى 25MB. أي رفع جديد سيكون private دائمًا.
                  </p>
                  {isUploadingPdf ? (
                    <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      جار رفع ملف PDF وربطه بالملخص...
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  يمكن رفع ملف PDF بعد حفظ الملخص لأول مرة.
                </p>
              )}

              <details className="rounded-md border bg-background px-3 py-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">خيار متقدم: معرف مرفق PDF</summary>
                <div className="mt-3 grid gap-2">
                  <Label htmlFor="summary-pdfAttachmentId">معرف مرفق PDF</Label>
                  <Input
                    id="summary-pdfAttachmentId"
                    name="pdfAttachmentId"
                    value={pdfAttachmentId}
                    onChange={(event) => {
                      setPdfAttachmentId(event.target.value);
                      if (!event.target.value) setPdfAttachment(null);
                    }}
                    placeholder="UUID لمرفق PDF موجود"
                    className="h-11 text-left"
                    dir="ltr"
                    aria-invalid={Boolean(fieldError("pdfAttachmentId"))}
                  />
                  <FieldError message={fieldError("pdfAttachmentId")} />
                  <p className="text-xs text-muted-foreground">
                    استخدم هذا الخيار فقط إذا كان لديك مرفق PDF موجود مسبقًا.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary-excerpt">وصف مختصر</Label>
            <Textarea
              id="summary-excerpt"
              name="excerpt"
              defaultValue={summary?.excerpt ?? ""}
              maxLength={700}
              aria-invalid={Boolean(fieldError("excerpt"))}
            />
            <FieldError message={fieldError("excerpt")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary-contentHtml">محتوى HTML</Label>
            <Textarea
              id="summary-contentHtml"
              name="contentHtml"
              defaultValue={summary?.contentHtml ?? ""}
              className="min-h-[220px] font-mono text-sm"
              dir="ltr"
              placeholder="<p>اكتب محتوى الملخص هنا...</p>"
              aria-invalid={Boolean(fieldError("contentHtml"))}
            />
            <FieldError message={fieldError("contentHtml")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary-contentText">نص الملخص</Label>
            <Textarea
              id="summary-contentText"
              name="contentText"
              defaultValue={summary?.contentText ?? ""}
              className="min-h-[140px]"
              placeholder="نسخة نصية مبسطة من الملخص."
              aria-invalid={Boolean(fieldError("contentText"))}
            />
            <FieldError message={fieldError("contentText")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="summary-isFeatured">ملخص مميز</Label>
              <p className="text-xs text-muted-foreground">يفيد لاحقًا في ترتيب الملخصات داخل صفحة المادة.</p>
            </div>
            <Switch id="summary-isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending || !selectedSubjectId}>
              {isPending ? "جاري الحفظ..." : summary ? "حفظ التعديل" : "إضافة الملخص"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

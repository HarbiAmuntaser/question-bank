"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Heading2, ImageIcon, List, Loader2, Pilcrow, Plus, Quote, RefreshCw, Trash2 } from "lucide-react";

import { createBlogPostAction, updateBlogPostAction } from "@/app/admin/blog/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import type {
  BlogCountryCode,
  BlogPostRow,
  BlogPostStatus,
  BlogPostTagOption,
  BlogPostTopicOption,
  BlogVisibility,
} from "./types";

const countryOptions: Array<{ value: BlogCountryCode; label: string }> = [
  { value: "SA", label: "السعودية" },
  { value: "YE", label: "اليمن" },
];

const coverImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const coverMaxBytes = 5 * 1024 * 1024;

type UploadedInlineImage = {
  id: string;
  url: string;
  title: string | null;
};

type BlogInlineAttachment = {
  id: string;
  url: string | null;
  title: string | null;
  originalName: string | null;
  sizeBytes: number | null;
  contentType: string | null;
  kind: string;
  visibility: string;
  createdAt: string;
  meta: unknown;
};

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

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildInlineImageSnippet(url: string, altText: string) {
  const safeUrl = escapeHtmlAttribute(url);
  const safeAlt = escapeHtmlAttribute(altText);

  return [
    "<figure>",
    `  <img src="${safeUrl}" alt="${safeAlt}" loading="lazy" decoding="async" />`,
    "</figure>",
  ].join("\n");
}

function getAttachmentPurpose(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const purpose = (meta as { purpose?: unknown }).purpose;
  return typeof purpose === "string" ? purpose : null;
}

function isBlogInlineAttachment(attachment: BlogInlineAttachment) {
  return (
    attachment.kind === "image" &&
    attachment.visibility === "public" &&
    Boolean(attachment.url) &&
    getAttachmentPurpose(attachment.meta) === "blog-inline"
  );
}

function formatBytes(value: number | null) {
  if (!value || value <= 0) return null;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function BlogPostDialog({
  post,
  topics,
  tags,
  children,
  open,
  onOpenChange,
}: {
  post?: BlogPostRow;
  topics: BlogPostTopicOption[];
  tags: BlogPostTagOption[];
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [primaryTopicId, setPrimaryTopicId] = useState("");
  const [status, setStatus] = useState<BlogPostStatus>("draft");
  const [visibility, setVisibility] = useState<BlogVisibility>("global");
  const [featured, setFeatured] = useState(false);
  const [coverAttachmentId, setCoverAttachmentId] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverAttachmentTitle, setCoverAttachmentTitle] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [contentHtml, setContentHtml] = useState("");
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [inlineImagePreview, setInlineImagePreview] = useState<UploadedInlineImage | null>(null);
  const [inlineImages, setInlineImages] = useState<BlogInlineAttachment[]>([]);
  const [isLoadingInlineImages, setIsLoadingInlineImages] = useState(false);
  const [inlineImagesError, setInlineImagesError] = useState<string | null>(null);
  const [deletingInlineImageId, setDeletingInlineImageId] = useState<string | null>(null);
  const contentHtmlRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;
  const selectedTagIds = useMemo(() => new Set(post?.tags.map((tag) => tag.id) ?? []), [post?.tags]);
  const selectedCountries = useMemo(() => new Set(post?.countries ?? []), [post?.countries]);

  useEffect(() => {
    if (!dialogOpen) return;
    setTitle(post?.title ?? "");
    setSlug(post?.slug ?? "");
    setSlugTouched(Boolean(post));
    setPrimaryTopicId(post?.primaryTopic.id ?? topics[0]?.id ?? "");
    setStatus(post?.status ?? "draft");
    setVisibility(post?.visibility ?? "global");
    setFeatured(post?.featured ?? false);
    setCoverAttachmentId(post?.coverAttachmentId ?? "");
    setCoverPreviewUrl(post?.coverAttachment?.url ?? null);
    setCoverAttachmentTitle(post?.coverAttachment?.title ?? null);
    setContentHtml(post?.contentHtml ?? "");
    setInlineImagePreview(null);
    setInlineImages([]);
    setInlineImagesError(null);
  }, [dialogOpen, post, topics]);

  const insertContentHtmlSnippet = useCallback((snippet: string) => {
    const textarea = contentHtmlRef.current;
    const start = textarea?.selectionStart ?? contentHtml.length;
    const end = textarea?.selectionEnd ?? contentHtml.length;
    const before = contentHtml.slice(0, start);
    const after = contentHtml.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
    const insertion = `${prefix}${snippet}${suffix}`;
    const nextValue = `${before}${insertion}${after}`;

    setContentHtml(nextValue);

    window.requestAnimationFrame(() => {
      const nextTextarea = contentHtmlRef.current;
      if (!nextTextarea) return;
      const cursor = before.length + insertion.length;
      nextTextarea.focus();
      nextTextarea.setSelectionRange(cursor, cursor);
    });
  }, [contentHtml]);

  const appendInlineImageToContent = useCallback((url: string, altText: string) => {
    insertContentHtmlSnippet(buildInlineImageSnippet(url, altText));
  }, [insertContentHtmlSnippet]);

  const loadInlineImages = useCallback(async () => {
    if (!post?.id) {
      setInlineImages([]);
      return;
    }

    setIsLoadingInlineImages(true);
    setInlineImagesError(null);
    try {
      const params = new URLSearchParams({
        ownerType: "blog_post",
        ownerId: post.id,
        pageSize: "100",
      });
      const res = await fetch(`/api/v1/admin/attachments?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "attachments_load_failed");
      }

      const rows = Array.isArray(body?.data) ? (body.data as BlogInlineAttachment[]) : [];
      setInlineImages(rows.filter(isBlogInlineAttachment));
    } catch (error) {
      setInlineImagesError(error instanceof Error ? error.message : "تعذر تحميل صور المقال.");
    } finally {
      setIsLoadingInlineImages(false);
    }
  }, [post?.id]);

  useEffect(() => {
    if (!dialogOpen || !post?.id) return;
    void loadInlineImages();
  }, [dialogOpen, loadInlineImages, post?.id]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const insertEditorSnippet = useCallback((buildSnippet: (selectedText: string) => string) => {
    const textarea = contentHtmlRef.current;
    const selectedText = textarea
      ? contentHtml.slice(textarea.selectionStart, textarea.selectionEnd).trim()
      : "";
    insertContentHtmlSnippet(buildSnippet(selectedText));
  }, [contentHtml, insertContentHtmlSnippet]);

  const insertParagraphSnippet = () => {
    insertEditorSnippet((selectedText) => `<p>${escapeHtmlText(selectedText || "اكتب الفقرة هنا...")}</p>`);
  };

  const insertHeadingSnippet = () => {
    insertEditorSnippet((selectedText) => `<h2>${escapeHtmlText(selectedText || "عنوان القسم")}</h2>`);
  };

  const insertListSnippet = () => {
    insertEditorSnippet((selectedText) => {
      const items = (selectedText ? selectedText.split(/\r?\n/) : ["عنصر القائمة"])
        .map((item) => item.trim())
        .filter(Boolean);
      const listItems = (items.length ? items : ["عنصر القائمة"])
        .map((item) => `  <li>${escapeHtmlText(item)}</li>`)
        .join("\n");

      return `<ul>\n${listItems}\n</ul>`;
    });
  };

  const insertQuoteSnippet = () => {
    insertEditorSnippet((selectedText) => `<blockquote>\n  <p>${escapeHtmlText(selectedText || "اكتب الاقتباس هنا...")}</p>\n</blockquote>`);
  };

  const insertDividerSnippet = () => {
    insertContentHtmlSnippet("<hr />");
  };

  const handleInsertInlineImage = (attachment: BlogInlineAttachment) => {
    if (!attachment.url) return;
    appendInlineImageToContent(attachment.url, attachment.title || attachment.originalName || title || post?.title || "صورة داخل المقال");
    toast({
      title: "تم إدراج الصورة",
      description: "تمت إضافة كود الصورة في نهاية محتوى HTML. احفظ المقال لتطبيق التغيير.",
    });
  };

  const handleCopyInlineImageUrl = async (url: string | null) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "تم نسخ الرابط", description: "تم نسخ رابط الصورة إلى الحافظة." });
    } catch {
      toast({
        title: "تعذر نسخ الرابط",
        description: "انسخ الرابط يدويًا من البطاقة.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInlineImage = async (attachment: BlogInlineAttachment) => {
    const isReferenced = Boolean(attachment.url && contentHtml.includes(attachment.url));
    const ok = window.confirm(
      isReferenced
        ? "هذه الصورة مستخدمة داخل محتوى HTML الحالي. حذفها قد يترك صورة مكسورة في المقال إذا لم تزل الكود وتحفظ المقال. هل تريد المتابعة؟"
        : "هل تريد حذف هذه الصورة من المرفقات وR2؟",
    );
    if (!ok) return;

    setDeletingInlineImageId(attachment.id);
    try {
      const res = await fetch(`/api/v1/admin/attachments/${attachment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "attachment_delete_failed");
      }

      setInlineImages((current) => current.filter((item) => item.id !== attachment.id));
      if (inlineImagePreview?.id === attachment.id) setInlineImagePreview(null);
      toast({
        title: "تم حذف الصورة",
        description: isReferenced ? "أزل كود الصورة من محتوى HTML ثم احفظ المقال لتجنب رابط مكسور." : "تم حذف الصورة من المرفقات.",
      });
    } catch (error) {
      toast({
        title: "تعذر حذف الصورة",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الصورة.",
        variant: "destructive",
      });
    } finally {
      setDeletingInlineImageId(null);
    }
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    if (!post?.id) {
      toast({
        title: "احفظ المقال أولًا",
        description: "يمكن رفع صورة الغلاف بعد حفظ المقال لأول مرة.",
        variant: "destructive",
      });
      return;
    }
    if (!coverImageTypes.has(file.type)) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يسمح فقط بصور PNG أو JPEG أو WebP.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > coverMaxBytes) {
      toast({
        title: "الصورة كبيرة جدًا",
        description: "الحد الأقصى لصورة الغلاف هو 5MB.",
        variant: "destructive",
      });
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("ownerType", "blog_post");
    uploadForm.append("ownerId", post.id);
    uploadForm.append("kind", "image");
    uploadForm.append("visibility", "public");
    uploadForm.append("purpose", "blog-cover");
    uploadForm.append("title", file.name || title || post.title);

    setIsUploadingCover(true);
    try {
      const uploadRes = await fetch("/api/v1/admin/attachments", {
        method: "POST",
        body: uploadForm,
        credentials: "include",
      });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      const attachment = uploadBody?.data as { id?: string; url?: string | null; title?: string | null } | undefined;

      if (!uploadRes.ok || !attachment?.id) {
        throw new Error(uploadBody?.error || "attachment_upload_failed");
      }

      setCoverAttachmentId(attachment.id);
      setCoverPreviewUrl(attachment.url ?? null);
      setCoverAttachmentTitle(attachment.title ?? file.name);
      toast({ title: "تم رفع الغلاف", description: "تم ربط صورة الغلاف بالمقال بنجاح." });
      router.refresh();
    } catch (error) {
      toast({
        title: "تعذر رفع الغلاف",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع صورة الغلاف.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleInlineImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!post?.id) {
      toast({
        title: "احفظ المقال أولًا",
        description: "يمكن إضافة صور داخل المقال بعد حفظ المقال لأول مرة.",
        variant: "destructive",
      });
      return;
    }
    if (!coverImageTypes.has(file.type)) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يسمح فقط بصور PNG أو JPEG أو WebP داخل المقال.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > coverMaxBytes) {
      toast({
        title: "الصورة كبيرة جدًا",
        description: "الحد الأقصى لصورة المقال الداخلية هو 5MB.",
        variant: "destructive",
      });
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("ownerType", "blog_post");
    uploadForm.append("ownerId", post.id);
    uploadForm.append("kind", "image");
    uploadForm.append("visibility", "public");
    uploadForm.append("purpose", "blog-inline");
    uploadForm.append("title", file.name || title || post.title);

    setIsUploadingInlineImage(true);
    try {
      const uploadRes = await fetch("/api/v1/admin/attachments", {
        method: "POST",
        body: uploadForm,
        credentials: "include",
      });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      const attachment = uploadBody?.data as { id?: string; url?: string | null; title?: string | null } | undefined;

      if (!uploadRes.ok || !attachment?.id) {
        throw new Error(uploadBody?.error || "attachment_upload_failed");
      }
      if (!attachment.url || !attachment.url.startsWith("https://")) {
        throw new Error("blog_inline_image_requires_public_https_url");
      }

      const altText = attachment.title || file.name || title || post.title || "صورة داخل المقال";
      appendInlineImageToContent(attachment.url, altText);
      setInlineImagePreview({ id: attachment.id, url: attachment.url, title: attachment.title ?? file.name });
      void loadInlineImages();
      toast({
        title: "تم إدراج الصورة داخل المحتوى",
        description: "تمت إضافة كود الصورة في نهاية محتوى HTML. احفظ المقال لتظهر في الصفحة العامة.",
      });
    } catch (error) {
      toast({
        title: "تعذر رفع صورة المقال",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع الصورة داخل المقال.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingInlineImage(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = post ? await updateBlogPostAction(post.id, formData) : await createBlogPostAction(formData);

      if (result.success) {
        toast({ title: "تم الحفظ", description: result.message });
        setDialogOpen(false);
        router.refresh();
        return;
      }

      toast({ title: "تعذر الحفظ", description: result.message, variant: "destructive" });
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{post ? "تعديل المقال" : "إضافة مقال"}</DialogTitle>
          <DialogDescription>
            استخدم حقولًا بسيطة الآن. يمكن استبدال textarea بمحرر متقدم لاحقًا بدون تغيير نموذج البيانات.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="primaryTopicId" value={primaryTopicId} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="visibility" value={visibility} />
          <input type="hidden" name="featured" value={featured ? "true" : "false"} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="blog-title">العنوان</Label>
              <Input
                id="blog-title"
                name="title"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="blog-slug">Slug</Label>
              <Input
                id="blog-slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                className="h-11 text-left"
                dir="ltr"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>الموضوع الرئيسي</Label>
              <Select value={primaryTopicId} onValueChange={setPrimaryTopicId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="اختر الموضوع" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>الحالة</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as BlogPostStatus)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="published">منشور</SelectItem>
                  <SelectItem value="archived">مؤرشف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>الظهور</Label>
              <Select value={visibility} onValueChange={(value) => setVisibility(value as BlogVisibility)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">عام لكل الدول</SelectItem>
                  <SelectItem value="countries">دول محددة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="publishedAt">تاريخ النشر</Label>
              <Input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={toDateTimeLocal(post?.publishedAt ?? null)} className="h-11" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="readingMinutes">مدة القراءة بالدقائق</Label>
              <Input
                id="readingMinutes"
                name="readingMinutes"
                type="number"
                min={1}
                defaultValue={post?.readingMinutes ?? ""}
                className="h-11"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">ترتيب العرض</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={post?.sortOrder ?? 0} className="h-11" />
            </div>

            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Label>صورة غلاف المقال</Label>
                  <p className="text-sm text-muted-foreground">
                    الغلاف يرفع كمرفق عام مرتبط بالمقال، ويستخدم Attachment.url للعرض.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                  <ImageIcon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              {coverPreviewUrl ? (
                <div className="overflow-hidden rounded-lg border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreviewUrl} alt="معاينة صورة الغلاف" className="h-44 w-full object-cover" />
                </div>
              ) : (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-background text-sm text-muted-foreground">
                  لا توجد صورة غلاف مرتبطة بهذا المقال.
                </div>
              )}

              {coverAttachmentTitle || coverAttachmentId ? (
                <p className="text-xs text-muted-foreground">
                  {coverAttachmentTitle ? `المرفق الحالي: ${coverAttachmentTitle}` : null}
                  {coverAttachmentTitle && coverAttachmentId ? " · " : null}
                  {coverAttachmentId ? <span dir="ltr">{coverAttachmentId}</span> : null}
                </p>
              ) : null}

              {post?.id ? (
                <div className="grid gap-2">
                  <Label htmlFor="blog-cover-upload">رفع غلاف جديد</Label>
                  <Input
                    id="blog-cover-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isUploadingCover}
                    onChange={(event) => {
                      void handleCoverUpload(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    يسمح فقط بصور PNG أو JPEG أو WebP، بحد أقصى 5MB.
                  </p>
                  {isUploadingCover ? (
                    <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      جار رفع الغلاف وربطه بالمقال...
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  يمكن رفع صورة الغلاف بعد حفظ المقال لأول مرة.
                </p>
              )}

              <details className="rounded-md border bg-background px-3 py-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">خيار متقدم: معرف مرفق الغلاف</summary>
                <div className="mt-3 grid gap-2">
                  <Label htmlFor="coverAttachmentId">معرّف مرفق الغلاف</Label>
                  <Input
                    id="coverAttachmentId"
                    name="coverAttachmentId"
                    value={coverAttachmentId}
                    onChange={(event) => {
                      setCoverAttachmentId(event.target.value);
                      if (!event.target.value) {
                        setCoverPreviewUrl(null);
                        setCoverAttachmentTitle(null);
                      }
                    }}
                    placeholder="اختياري: UUID من جدول Attachment"
                    className="h-11 text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    استخدم هذا الخيار فقط إذا كان لديك مرفق موجود مسبقًا.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="excerpt">الملخص</Label>
            <Textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt ?? ""} maxLength={500} />
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <Label>الوسوم</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tags.length ? (
                tags.map((tag) => (
                  <label key={tag.id} className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm">
                    <Checkbox name="tagIds" value={tag.id} defaultChecked={selectedTagIds.has(tag.id)} />
                    <span>{tag.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد وسوم نشطة بعد.</p>
              )}
            </div>
          </div>

          {visibility === "countries" ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <Label>الدول</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {countryOptions.map((country) => (
                  <label key={country.value} className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm">
                    <Checkbox name="countries" value={country.value} defaultChecked={selectedCountries.has(country.value)} />
                    <span>{country.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <Label>صور داخل المقال</Label>
                <p className="text-sm text-muted-foreground">
                  ارفع صورة عامة إلى R2 وسيتم إدراج كود HTML الخاص بها في نهاية محتوى المقال.
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
                <ImageIcon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            {post?.id ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="blog-inline-image-upload">رفع صورة داخل المحتوى</Label>
                  <Input
                    id="blog-inline-image-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isUploadingInlineImage}
                    onChange={(event) => {
                      void handleInlineImageUpload(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    الصور الداخلية تكون عامة فقط. يسمح بصور PNG أو JPEG أو WebP بحد أقصى 5MB.
                  </p>
                </div>

                {isUploadingInlineImage ? (
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    جار رفع الصورة وإدراجها في محتوى المقال...
                  </p>
                ) : null}

                {inlineImagePreview ? (
                  <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[112px_1fr] sm:items-center">
                    <div className="overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={inlineImagePreview.url} alt={inlineImagePreview.title ?? "صورة داخل المقال"} className="h-24 w-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">تم إدراج الصورة داخل المحتوى</p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">
                        {inlineImagePreview.url}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        احفظ المقال بعد مراجعة موضع الكود داخل حقل HTML.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 rounded-md border bg-background p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">الصور المرفوعة لهذا المقال</p>
                      <p className="text-xs text-muted-foreground">
                        يمكنك إعادة إدراج صورة موجودة أو نسخ رابطها. احذف الصورة فقط إذا لم تعد مستخدمة داخل HTML.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadInlineImages()} disabled={isLoadingInlineImages}>
                      {isLoadingInlineImages ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      )}
                      تحديث
                    </Button>
                  </div>

                  {inlineImagesError ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      تعذر تحميل صور المقال مؤقتًا. حاول تحديث القائمة.
                    </p>
                  ) : null}

                  {isLoadingInlineImages && !inlineImages.length ? (
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      جار تحميل الصور...
                    </p>
                  ) : null}

                  {!isLoadingInlineImages && !inlineImagesError && inlineImages.length === 0 ? (
                    <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      لا توجد صور داخلية مرفوعة لهذا المقال بعد.
                    </p>
                  ) : null}

                  {inlineImages.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {inlineImages.map((attachment) => {
                        const size = formatBytes(attachment.sizeBytes);
                        const isReferenced = Boolean(attachment.url && contentHtml.includes(attachment.url));

                        return (
                          <div key={attachment.id} className="grid gap-3 rounded-md border p-3">
                            <div className="grid grid-cols-[88px_1fr] gap-3">
                              <div className="overflow-hidden rounded-md border bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={attachment.url ?? ""} alt={attachment.title ?? attachment.originalName ?? "صورة داخل المقال"} className="h-20 w-full object-cover" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-medium">{attachment.title || attachment.originalName || "صورة داخل المقال"}</p>
                                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                                  {attachment.url}
                                </p>
                                <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                                  {size ? <span className="rounded-full bg-muted px-2 py-0.5">{size}</span> : null}
                                  {isReferenced ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">مستخدمة في HTML</span> : null}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="secondary" size="sm" onClick={() => handleInsertInlineImage(attachment)}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                إدراج
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyInlineImageUrl(attachment.url)}>
                                <Copy className="h-4 w-4" aria-hidden="true" />
                                نسخ الرابط
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteInlineImage(attachment)}
                                disabled={deletingInlineImageId === attachment.id}
                              >
                                {deletingInlineImageId === attachment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                )}
                                حذف
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                يمكن إضافة صور داخل المقال بعد حفظ المقال لأول مرة.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contentHtml">محتوى HTML</Label>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={insertHeadingSnippet}>
                  <Heading2 className="h-4 w-4" aria-hidden="true" />
                  عنوان
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={insertParagraphSnippet}>
                  <Pilcrow className="h-4 w-4" aria-hidden="true" />
                  فقرة
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={insertListSnippet}>
                  <List className="h-4 w-4" aria-hidden="true" />
                  قائمة
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={insertQuoteSnippet}>
                  <Quote className="h-4 w-4" aria-hidden="true" />
                  اقتباس
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={insertDividerSnippet}>
                  فاصل
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                يمكنك تحديد نص داخل حقل HTML ثم اختيار تنسيق. يتم إدراج القالب عند موضع المؤشر بدون محرر ثقيل.
              </p>
            </div>
            <Textarea
              ref={contentHtmlRef}
              id="contentHtml"
              name="contentHtml"
              value={contentHtml}
              onChange={(event) => setContentHtml(event.target.value)}
              className="min-h-[220px] font-mono text-sm"
              dir="ltr"
              placeholder="<p>اكتب محتوى المقال هنا...</p>"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contentText">النص المبسط</Label>
            <Textarea
              id="contentText"
              name="contentText"
              defaultValue={post?.contentText ?? ""}
              className="min-h-[140px]"
              placeholder="نسخة نصية مبسطة من المقال. إذا تُركت فارغة سيتم استخراجها من HTML."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="featured">مقال مميز</Label>
              <p className="text-xs text-muted-foreground">يفيد لاحقًا في ترتيب وعرض المقالات العامة.</p>
            </div>
            <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending || topics.length === 0}>
              {isPending ? "جار الحفظ..." : post ? "حفظ التعديل" : "إضافة المقال"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

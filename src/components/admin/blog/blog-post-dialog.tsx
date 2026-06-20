"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  }, [dialogOpen, post, topics]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
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

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="coverAttachmentId">معرّف مرفق الغلاف</Label>
              <Input
                id="coverAttachmentId"
                name="coverAttachmentId"
                defaultValue={post?.coverAttachmentId ?? ""}
                placeholder="اختياري: UUID من جدول Attachment"
                className="h-11 text-left"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                لا يوجد رفع صور في هذه المرحلة. عند استخدام الغلاف لاحقًا سيكون المصدر هو Attachment.url فقط.
              </p>
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

          <div className="grid gap-2">
            <Label htmlFor="contentHtml">محتوى HTML</Label>
            <Textarea
              id="contentHtml"
              name="contentHtml"
              defaultValue={post?.contentHtml ?? ""}
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

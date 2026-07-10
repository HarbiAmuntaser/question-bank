// src/components/admin/seo/SeoMetaDialog.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createSeoMetaAction, updateSeoMetaAction } from "@/app/admin/seo-meta/actions";
import { SeoOwnerSelector } from "./SeoOwnerSelector";

const localeOptions = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
] as const;

type SeoRecord = {
  id?: string;
  ownerType: string;
  ownerId: string;
  locale: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  schemaJson?: any;
};

type FieldErrors = Partial<Record<keyof SeoRecord | "form", string>>;

// ✅ English slug (ASCII)
const asciiSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// ✅ Arabic/English letters + numbers + hyphen (no spaces)
const unicodeSlugRegex = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

function isValidUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function toArabicMsg(msg: string) {
  const map: Record<string, string> = {
    slug_required: "حقل Slug مطلوب",
    invalid_slug: "Slug غير صالح",
    "ownerId required": "يرجى اختيار المالك",
    invalid_schema_json: "Schema JSON غير صالح. تأكد أنه JSON صحيح",
    bad_query_params: "قيم الفلترة غير صحيحة",
    no_fields_to_update: "لا توجد حقول للتحديث",
    invalid_string: "القيمة غير صحيحة",
    "Invalid url": "الرابط غير صالح",
  };
  return map[msg] ?? msg;
}

export function SeoMetaDialog({
  open,
  onOpenChange,
  ownerType,
  ownerId,
  initialData,
  onSaved,
  lockOwner = false,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  ownerType: string;
  ownerId: string;
  initialData?: SeoRecord | null;
  onSaved?: () => void;
  lockOwner?: boolean;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<SeoRecord>({
    ownerType,
    ownerId,
    locale: "ar",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    canonicalUrl: "",
    noindex: false,
    nofollow: false,
    schemaJson: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const isEdit = Boolean(state.id);

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (initialData) {
      setState({
        ...initialData,
        schemaJson:
          typeof initialData.schemaJson === "object"
            ? JSON.stringify(initialData.schemaJson, null, 2)
            : initialData.schemaJson ?? "",
      });
    } else {
      setState({
        ownerType,
        ownerId,
        locale: "ar",
        slug: "",
        metaTitle: "",
        metaDescription: "",
        ogTitle: "",
        ogDescription: "",
        ogImageUrl: "",
        canonicalUrl: "",
        noindex: false,
        nofollow: false,
        schemaJson: "",
      });
    }
  }, [open, ownerType, ownerId, initialData]);

  function updateField<Field extends keyof SeoRecord>(field: Field, value: SeoRecord[Field]) {
    setState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const ownerErrorText = useMemo(() => errors.ownerId, [errors.ownerId]);
  const metaTitleLength = (state.metaTitle ?? "").trim().length;
  const metaDescriptionLength = (state.metaDescription ?? "").trim().length;

  function validateClient(): FieldErrors {
    const e: FieldErrors = {};

    if (!state.ownerId?.trim()) {
      e.ownerId = "يرجى اختيار المالك";
    }

    const rawSlug = (state.slug ?? "").trim();
    if (!rawSlug) e.slug = "حقل Slug مطلوب";
    else if (rawSlug.length > 190) e.slug = "Slug طويل جدًا";
    else {
      if (state.locale === "en") {
        const s = rawSlug.toLowerCase();
        if (!asciiSlugRegex.test(s)) {
          e.slug = "Slug للإنجليزية يجب أن يكون a-z/0-9 واستخدام (-) فقط";
        }
      } else {
        if (!unicodeSlugRegex.test(rawSlug)) {
          e.slug = "Slug يسمح بحروف/أرقام وشرطة (-) فقط بدون مسافات";
        }
      }
    }

    const og = (state.ogImageUrl ?? "").trim();
    if (og && !isValidUrl(og)) e.ogImageUrl = "رابط OG Image غير صالح";

    const canon = (state.canonicalUrl ?? "").trim();
    if (canon && !isValidUrl(canon)) e.canonicalUrl = "رابط Canonical غير صالح";

    const sj = typeof state.schemaJson === "string" ? state.schemaJson.trim() : "";
    if (sj) {
      try {
        JSON.parse(sj);
      } catch {
        e.schemaJson = "Schema JSON غير صالح. تأكد أنه JSON صحيح";
      }
    }

    return e;
  }

  function applyServerErrors(details: any) {
    const fieldErrors = details?.fieldErrors ?? {};
    const formErrors: string[] = details?.formErrors ?? [];

    const next: FieldErrors = {};
    for (const key of Object.keys(fieldErrors)) {
      const arr = fieldErrors[key];
      if (Array.isArray(arr) && arr.length > 0) {
        next[key as keyof SeoRecord] = toArabicMsg(String(arr[0]));
      }
    }

    if (formErrors.length > 0) next.form = toArabicMsg(String(formErrors[0]));
    if (Object.keys(next).length > 0) setErrors(next);
  }

  function submit() {
    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      toast({
        title: "تحقق من الحقول",
        description: "يرجى تصحيح الأخطاء الظاهرة أسفل الحقول.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ownerType: state.ownerType,
      ownerId: state.ownerId,
      locale: state.locale,
      slug: (state.slug ?? "").trim(), // ✅ السيرفر سيطبّع حسب locale
      metaTitle: state.metaTitle,
      metaDescription: state.metaDescription,
      ogTitle: state.ogTitle,
      ogDescription: state.ogDescription,
      ogImageUrl: state.ogImageUrl,
      canonicalUrl: state.canonicalUrl,
      noindex: state.noindex,
      nofollow: state.nofollow,
      schemaJson: state.schemaJson,
    };

    startTransition(async () => {
      const res = state.id ? await updateSeoMetaAction(state.id, payload) : await createSeoMetaAction(payload);

      if (!res.success) {
        if ((res as any).details) applyServerErrors((res as any).details);
        toast({
          title: "خطأ",
          description: toArabicMsg(res.message ?? "فشل حفظ بيانات SEO"),
          variant: "destructive",
        });
        return;
      }

      toast({ title: "تم الحفظ", description: res.message ?? "تم حفظ بيانات SEO" });
      onSaved?.();
      onOpenChange(false);
    });
  }

  const ErrorText = ({ text }: { text?: string }) =>
    text ? <p className="text-xs text-destructive mt-1">{text}</p> : null;

  const slugPlaceholder = state.locale === "en" ? "مثال: ksu-math-101" : "مثال: اختبار-رياضيات-101";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل بيانات SEO" : "إضافة بيانات SEO"}</DialogTitle>
          <DialogDescription>قم بتعبئة معلومات الميتا الخاصة بالصفحة (العناوين، الوصف، الروابط، إلخ).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {errors.form ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {errors.form}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SeoOwnerSelector
                ownerType={state.ownerType}
                ownerId={state.ownerId}
                onOwnerTypeChange={(v) => updateField("ownerType", v)}
                onOwnerIdChange={(v) => updateField("ownerId", v)}
                lockOwnerType={lockOwner}
                lockOwnerId={lockOwner}
              />
              <ErrorText text={ownerErrorText} />
            </div>

            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={state.locale} onValueChange={(value) => updateField("locale", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText text={errors.locale} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={state.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder={slugPlaceholder}
            />
            <ErrorText text={errors.slug} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input value={state.metaTitle ?? ""} onChange={(e) => updateField("metaTitle", e.target.value)} />
              <p className="text-xs text-muted-foreground arabic-numbers">
                عنوان واضح وغير مكرر. الطول الحالي: {metaTitleLength}/160
              </p>
              <ErrorText text={errors.metaTitle} />
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={state.metaDescription ?? ""}
                onChange={(e) => updateField("metaDescription", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground arabic-numbers">
                وصف مختصر ومقنع بدون حشو كلمات مفتاحية. الطول الحالي: {metaDescriptionLength}/320
              </p>
              <ErrorText text={errors.metaDescription} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OG Title</Label>
              <Input value={state.ogTitle ?? ""} onChange={(e) => updateField("ogTitle", e.target.value)} />
              <ErrorText text={errors.ogTitle} />
            </div>
            <div className="space-y-2">
              <Label>OG Description</Label>
              <Textarea
                value={state.ogDescription ?? ""}
                onChange={(e) => updateField("ogDescription", e.target.value)}
                rows={3}
              />
              <ErrorText text={errors.ogDescription} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input
                value={state.ogImageUrl ?? ""}
                onChange={(e) => updateField("ogImageUrl", e.target.value)}
                placeholder="https://..."
              />
              <ErrorText text={errors.ogImageUrl} />
            </div>
            <div className="space-y-2">
              <Label>Canonical URL</Label>
              <Input
                value={state.canonicalUrl ?? ""}
                onChange={(e) => updateField("canonicalUrl", e.target.value)}
                placeholder="https://..."
              />
              <ErrorText text={errors.canonicalUrl} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={state.noindex ?? false}
                onCheckedChange={(checked) => updateField("noindex", Boolean(checked))}
              />
              <div>
                <Label className="font-medium">Noindex</Label>
                <p className="text-sm text-muted-foreground">منع محركات البحث من الأرشفة</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                checked={state.nofollow ?? false}
                onCheckedChange={(checked) => updateField("nofollow", Boolean(checked))}
              />
              <div>
                <Label className="font-medium">Nofollow</Label>
                <p className="text-sm text-muted-foreground">منع محركات البحث من تتبع الروابط</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Schema JSON-LD</Label>
            <Textarea
              className="font-mono text-xs"
              rows={6}
              value={state.schemaJson ?? ""}
              onChange={(e) => updateField("schemaJson", e.target.value)}
              placeholder='{"@context": "https://schema.org", "@type": "Article"}'
            />
            <ErrorText text={errors.schemaJson} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : isEdit ? "تحديث" : "حفظ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

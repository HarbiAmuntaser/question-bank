"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createBlogTagAction,
  createBlogTopicAction,
  updateBlogTagAction,
  updateBlogTopicAction,
} from "@/app/admin/blog/actions";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import type { BlogTaxonomyKind, BlogTaxonomyRow } from "./types";

const kindLabels = {
  topic: {
    singular: "موضوع",
    createTitle: "إضافة موضوع",
    editTitle: "تعديل الموضوع",
    createDescription: "أضف موضوعًا لتصنيف مقالات المدونة لاحقًا.",
    editDescription: "حدّث بيانات الموضوع بدون التأثير على المقالات المرتبطة.",
  },
  tag: {
    singular: "وسم",
    createTitle: "إضافة وسم",
    editTitle: "تعديل الوسم",
    createDescription: "أضف وسمًا ليساعد في تنظيم مقالات المدونة لاحقًا.",
    editDescription: "حدّث بيانات الوسم بدون التأثير على المقالات المرتبطة.",
  },
} as const;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BlogTaxonomyDialog({
  kind,
  item,
  children,
  open,
  onOpenChange,
}: {
  kind: BlogTaxonomyKind;
  item?: BlogTaxonomyRow;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const labels = kindLabels[kind];
  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  useEffect(() => {
    if (!dialogOpen) return;
    setName(item?.name ?? "");
    setSlug(item?.slug ?? "");
    setDescription(item?.description ?? "");
    setIsActive(item?.isActive ?? true);
    setSlugTouched(Boolean(item));
  }, [dialogOpen, item]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = item
        ? kind === "topic"
          ? await updateBlogTopicAction(item.id, formData)
          : await updateBlogTagAction(item.id, formData)
        : kind === "topic"
          ? await createBlogTopicAction(formData)
          : await createBlogTagAction(formData);

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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{item ? labels.editTitle : labels.createTitle}</DialogTitle>
          <DialogDescription>{item ? labels.editDescription : labels.createDescription}</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`${kind}-name`}>اسم {labels.singular}</Label>
            <Input
              id={`${kind}-name`}
              name="name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder={kind === "topic" ? "مثال: الاستعداد للاختبارات" : "مثال: مذاكرة"}
              required
              minLength={2}
              maxLength={120}
              className="h-11"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${kind}-slug`}>Slug</Label>
            <Input
              id={`${kind}-slug`}
              name="slug"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="study-tips"
              required
              maxLength={190}
              dir="ltr"
              className="h-11 text-left"
            />
            <p className="text-xs text-muted-foreground">
              يستخدم لاحقًا في روابط المدونة. يُسمح بالحروف والأرقام والشرطة فقط.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${kind}-description`}>الوصف</Label>
            <Textarea
              id={`${kind}-description`}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="وصف مختصر يظهر للإدارة ويمكن استخدامه لاحقًا في صفحات المدونة."
              maxLength={500}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor={`${kind}-active`}>الحالة</Label>
              <p className="text-xs text-muted-foreground">العناصر غير النشطة لا تُستخدم لاحقًا في النشر العام.</p>
            </div>
            <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
            <Switch id={`${kind}-active`} checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جار الحفظ..." : item ? "حفظ التعديل" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

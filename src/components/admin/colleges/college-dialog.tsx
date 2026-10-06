"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";

import {
  createCollegeAction,
  updateCollegeAction,
} from "@/app/admin/colleges/actions";
import {
  AdminFieldError,
  AdminFormErrorSummary,
  useAdminFormValidation,
} from "@/components/admin/admin-form-validation";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { buildCollegeSlug, normalizeCollegeSlug } from "@/lib/college-slugs";

export type CollegeFormValue = {
  id: string;
  universityId: string;
  name: string;
  slug: string;
  code: string | null;
  isActive: boolean;
};

export function CollegeDialog({
  children,
  college,
  open,
  onOpenChange,
}: {
  children?: ReactNode;
  college?: CollegeFormValue;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const [universityId, setUniversityId] = useState(college?.universityId ?? "");
  const [name, setName] = useState(college?.name ?? "");
  const [slug, setSlug] = useState(college?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(college));
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const validation = useAdminFormValidation("college-form");
  const resetValidationErrors = validation.resetErrors;
  const controlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = controlled ? open : localOpen;
  const setDialogOpen = controlled ? onOpenChange! : setLocalOpen;

  useEffect(() => {
    if (!dialogOpen) return;
    setUniversityId(college?.universityId ?? "");
    setName(college?.name ?? "");
    setSlug(college?.slug ?? "");
    setSlugEdited(Boolean(college));
    resetValidationErrors();
  }, [college, dialogOpen, resetValidationErrors]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(buildCollegeSlug(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(normalizeCollegeSlug(value));
  };

  const submit = (formData: FormData) => {
    validation.resetErrors();
    if (!universityId) {
      validation.reportErrors({ fieldErrors: { universityId: "اختر الجامعة أولًا." } });
      return;
    }
    formData.set("universityId", universityId);
    startTransition(async () => {
      const result = college
        ? await updateCollegeAction(college.id, formData)
        : await createCollegeAction(formData);
      toast({
        title: result.success ? "نجح" : "خطأ",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (!result.success) validation.reportErrors({ formError: result.message });
      if (result.success) {
        setDialogOpen(false);
        window.location.href = "/admin/colleges";
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{college ? "تعديل الكلية" : "إضافة كلية"}</DialogTitle>
          <DialogDescription>
            الكليات متاحة للجامعات فقط، وربط التخصص بها اختياري.
          </DialogDescription>
        </DialogHeader>
        <form ref={validation.formRef} action={submit}>
          <AdminFormErrorSummary message={validation.formError} className="mt-4" />
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="university"
                  universityType="university"
                  value={universityId}
                  onValueChange={(value) => {
                    setUniversityId(value);
                    validation.clearFieldError("universityId");
                  }}
                  placeholder="ابحث عن جامعة"
                  {...validation.getFieldProps("universityId")}
                />
                <AdminFieldError
                  id={validation.errorId("universityId")}
                  message={validation.fieldErrors.universityId}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="college-name" className="text-right">اسم الكلية</Label>
              <Input
                id="college-name"
                name="name"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="college-slug" className="text-right">Slug</Label>
              <Input
                id="college-slug"
                name="slug"
                value={slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                className="col-span-3"
                dir="ltr"
                maxLength={190}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="college-code" className="text-right">الرمز</Label>
              <Input
                id="college-code"
                name="code"
                defaultValue={college?.code ?? ""}
                className="col-span-3"
                placeholder="مثال: ENG"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="college-active" className="text-right">نشطة</Label>
              <Switch
                id="college-active"
                name="isActive"
                defaultChecked={college?.isActive ?? true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !universityId}>
              {isPending ? "جاري الحفظ..." : college ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

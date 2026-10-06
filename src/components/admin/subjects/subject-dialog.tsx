"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";

import {
  createSubjectAction,
  getSubjectInstitutionContextAction,
  updateSubjectAction,
  type SubjectInstitutionContext,
} from "@/app/admin/subjects/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type SubjectDialogSubject = {
  id: string;
  majorId?: string;
  name: string;
  code: string | null;
  creditHours: number | null;
  semester: number | null;
  year: number | null;
  description: string | null;
  isActive: boolean;
  major?: {
    id?: string;
    university?: { id: string } | null;
  } | null;
};

interface SubjectDialogProps {
  children?: React.ReactNode;
  subject?: SubjectDialogSubject;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubjectDialog({ children, subject, open, onOpenChange }: SubjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [institutionContext, setInstitutionContext] = useState<SubjectInstitutionContext | null>(null);
  const { toast } = useToast();
  const validation = useAdminFormValidation("subject-form");
  const resetValidationErrors = validation.resetErrors;

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  useEffect(() => {
    if (!dialogOpen) return;
    setSelectedUniversityId(subject?.major?.university?.id ?? "");
    setSelectedMajorId(subject?.majorId ?? subject?.major?.id ?? "");
    resetValidationErrors();
  }, [dialogOpen, subject, resetValidationErrors]);

  useEffect(() => {
    let active = true;

    if (!dialogOpen || !selectedUniversityId) {
      setInstitutionContext(null);
      return;
    }

    void getSubjectInstitutionContextAction(selectedUniversityId)
      .then((context) => {
        if (active) setInstitutionContext(context);
      })
      .catch(() => {
        if (active) setInstitutionContext(null);
      });

    return () => {
      active = false;
    };
  }, [dialogOpen, selectedUniversityId]);

  const handleUniversityChange = (value: string) => {
    setSelectedUniversityId(value);
    setSelectedMajorId("");
    setInstitutionContext(null);
    validation.clearFieldError("universityId");
    validation.clearFieldError("majorId");
  };

  const isUniversity = institutionContext?.institutionType === "university";
  const isAcademy = institutionContext?.institutionType === "academy";
  const showAcademicPeriodFields = Boolean(selectedUniversityId) && !isAcademy;

  const handleSubmit = async (formData: FormData) => {
    validation.resetErrors();
    if (!selectedUniversityId) {
      validation.reportErrors({ fieldErrors: { universityId: "يرجى اختيار الجامعة." } });
      return;
    }
    if (!selectedMajorId) {
      validation.reportErrors({ fieldErrors: { majorId: "يرجى اختيار التخصص." } });
      return;
    }

    formData.set("majorId", selectedMajorId);

    startTransition(async () => {
      try {
        const result = subject ? await updateSubjectAction(subject.id, formData) : await createSubjectAction(formData);

        if (result.success) {
          toast({ title: "نجح", description: result.message });
          setDialogOpen(false);
          setSelectedUniversityId("");
          setSelectedMajorId("");
        } else {
          validation.reportErrors({ formError: result.message });
          toast({ title: "خطأ", description: result.message, variant: "destructive" });
        }
      } catch {
        validation.reportErrors({ formError: "حدث خطأ غير متوقع. أعد المحاولة." });
        toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{subject ? "تعديل المقرر" : "إضافة مقرر"}</DialogTitle>
          <DialogDescription>
            {subject ? "قم بتحديث معلومات المقرر أدناه." : "أضف مقرراً جديداً إلى النظام."}
          </DialogDescription>
        </DialogHeader>

        <form ref={validation.formRef} action={handleSubmit}>
          <AdminFormErrorSummary message={validation.formError} className="mt-4" />
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="university"
                  value={selectedUniversityId}
                  onValueChange={handleUniversityChange}
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
              <Label className="text-right">التخصص</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="major"
                  value={selectedMajorId}
                  onValueChange={(value) => {
                    setSelectedMajorId(value);
                    validation.clearFieldError("majorId");
                  }}
                  universityId={selectedUniversityId}
                  disabled={!selectedUniversityId}
                  placeholder={selectedUniversityId ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
                  {...validation.getFieldProps("majorId")}
                />
                <AdminFieldError
                  id={validation.errorId("majorId")}
                  message={validation.fieldErrors.majorId}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                اسم المقرر
              </Label>
              <Input id="name" name="name" defaultValue={subject?.name} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                رمز المقرر
              </Label>
              <Input id="code" name="code" defaultValue={subject?.code ?? ""} className="col-span-3" placeholder="مثال: CS101" />
            </div>

            <div className={showAcademicPeriodFields ? "grid grid-cols-2 gap-4" : "grid"}>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="creditHours" className="col-span-2 text-right">
                  الساعات المعتمدة
                </Label>
                <Input
                  id="creditHours"
                  name="creditHours"
                  type="number"
                  min="1"
                  max="6"
                  defaultValue={subject?.creditHours ?? ""}
                  className="col-span-2"
                  placeholder="3"
                />
              </div>

              {showAcademicPeriodFields ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="semester" className="col-span-2 text-right">
                  الفصل الدراسي
                  </Label>
                  <Input
                    id="semester"
                    name="semester"
                    type="number"
                    min="1"
                    max={isUniversity ? 2 : 3}
                    defaultValue={subject?.semester ?? ""}
                    className="col-span-2"
                    placeholder="1"
                    required={isUniversity}
                  />
                </div>
              ) : null}
            </div>

            {showAcademicPeriodFields ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="year" className="text-right">
                السنة الدراسية
                  </Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1"
                    max="6"
                    defaultValue={subject?.year ?? ""}
                    className="col-span-3"
                    placeholder="1"
                    required={isUniversity}
                  />
                </div>
                {isUniversity ? (
                  <p className="text-xs leading-relaxed text-foreground/70">
                    تُستخدم السنة والفصل لتجميع مواد الجامعة. مثال: السنة الثانية والفصل الأول يظهران كمستوى ثالث في السعودية.
                  </p>
                ) : null}
              </div>
            ) : null}

            {isAcademy ? (
              <p className="rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground/75">
                مواد المسارات التدريبية لا ترتبط بسنة أو فصل دراسي.
              </p>
            ) : null}

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="pt-2 text-right">
                الوصف
              </Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={subject?.description ?? ""}
                className="col-span-3"
                placeholder="وصف المقرر وأهدافه التعليمية..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                نشط
              </Label>
              <Switch id="isActive" name="isActive" defaultChecked={subject?.isActive ?? true} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedUniversityId || !selectedMajorId}>
              {isPending ? "جاري الحفظ..." : subject ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";

import { createPaidAccessPlanAction, updatePaidAccessPlanAction } from "@/app/admin/subscriptions/actions";
import {
  AdminContentPathPicker,
  emptyAdminContentPath,
  type AdminContentPathValue,
} from "@/components/admin/admin-content-path-picker";
import {
  AdminFieldError,
  AdminFormErrorSummary,
  normalizeAdminFormErrors,
  useAdminFormValidation,
} from "@/components/admin/admin-form-validation";
import type { PlanRow } from "@/components/admin/subscriptions/types";
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

export function PlanDialog({ children, plan, paymentsEnabled = false }: { children: React.ReactNode; plan?: PlanRow; paymentsEnabled?: boolean }) {
  const formId = plan ? `edit-plan-${plan.id}` : "create-plan";
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [path, setPath] = useState<AdminContentPathValue>({ ...emptyAdminContentPath });
  const { toast } = useToast();
  const validation = useAdminFormValidation(formId);
  const resetValidation = validation.resetErrors;

  useEffect(() => {
    if (!open) return;
    setPath({ ...emptyAdminContentPath });
    resetValidation();
  }, [open, plan, resetValidation]);

  function handleSubmit(formData: FormData) {
    formData.set("scopeType", "subject");
    formData.set("subjectId", plan?.subjectId ?? path.subjectId);
    if (!plan?.subjectId && !path.subjectId) {
      validation.reportErrors({ fieldErrors: { subjectId: "اختيار المادة مطلوب." } });
      toast({ title: "خطأ", description: "اختيار المقرر مطلوب", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = plan
        ? await updatePaidAccessPlanAction(plan.id, formData)
        : await createPaidAccessPlanAction(formData);

      if (result.success) {
        toast({ title: "تم", description: result.message });
        setOpen(false);
      } else {
        validation.reportErrors(normalizeAdminFormErrors("details" in result ? result.details : undefined, result.message));
        toast({ title: "خطأ", description: result.message, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{plan ? "تعديل خطة اشتراك" : "إنشاء خطة اشتراك"}</DialogTitle>
          <DialogDescription>مواد الجامعات السعودية</DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          ref={validation.formRef}
          action={handleSubmit}
          className="space-y-5"
          onChangeCapture={(event) => {
            const target = event.target as HTMLInputElement | HTMLTextAreaElement;
            if (target.name) validation.clearFieldError(target.name);
          }}
        >
          <AdminFormErrorSummary message={validation.formError} />
          {plan && <input type="hidden" name="expectedUpdatedAt" value={plan.updatedAt} />}
          <div className="space-y-2" tabIndex={-1} {...validation.getFieldProps("subjectId")}>
            <Label>المادة</Label>
            {plan?.subject ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">{plan.subject.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[plan.subject.universityName, plan.subject.collegeName, plan.subject.majorName].filter(Boolean).join(" / ")}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">هدف الخطة ثابت بعد الإنشاء.</p>
              </div>
            ) : (
              <AdminContentPathPicker value={path} onChange={setPath} paymentScope disabled={pending} />
            )}
            <AdminFieldError id={validation.errorId("subjectId")} message={validation.fieldErrors.subjectId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">عنوان الخطة</Label>
              <Input id="title" name="title" defaultValue={plan?.title ?? ""} required {...validation.getFieldProps("title")} />
              <AdminFieldError id={validation.errorId("title")} message={validation.fieldErrors.title} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea id="description" name="description" defaultValue={plan?.description ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">السعر</Label>
              <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={plan?.price ?? ""} {...validation.getFieldProps("price")} />
              <AdminFieldError id={validation.errorId("price")} message={validation.fieldErrors.price} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Input id="currency" name="currency" defaultValue={plan?.currency ?? "SAR"} {...validation.getFieldProps("currency")} />
              <AdminFieldError id={validation.errorId("currency")} message={validation.fieldErrors.currency} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDurationDays">مدة الاشتراك الافتراضية بالأيام</Label>
              <Input id="defaultDurationDays" name="defaultDurationDays" type="number" min="1" defaultValue={plan?.defaultDurationDays ?? ""} {...validation.getFieldProps("defaultDurationDays")} />
              <AdminFieldError id={validation.errorId("defaultDurationDays")} message={validation.fieldErrors.defaultDurationDays} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultMaxUses">عدد استخدامات الكود الافتراضي</Label>
              <Input id="defaultMaxUses" name="defaultMaxUses" type="number" min="1" defaultValue={plan?.defaultMaxUses ?? 1} {...validation.getFieldProps("defaultMaxUses")} />
              <AdminFieldError id={validation.errorId("defaultMaxUses")} message={validation.fieldErrors.defaultMaxUses} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">رقم واتساب</Label>
              <Input id="whatsappNumber" name="whatsappNumber" dir="ltr" defaultValue={plan?.whatsappNumber ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramUsername">اسم تليجرام</Label>
              <Input id="telegramUsername" name="telegramUsername" dir="ltr" defaultValue={plan?.telegramUsername ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contactMessage">رسالة التواصل الافتراضية</Label>
              <Textarea id="contactMessage" name="contactMessage" defaultValue={plan?.contactMessage ?? ""} rows={3} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="isActive" name="isActive" defaultChecked={paymentsEnabled && (plan?.isActive ?? false)} disabled={!paymentsEnabled} />
            <Label htmlFor="isActive">الخطة نشطة</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="activationCodesEnabled" name="activationCodesEnabled" defaultChecked={plan?.activationCodesEnabled ?? false} />
            <div>
              <Label htmlFor="activationCodesEnabled">السماح بأكواد التفعيل لهذه الخطة</Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                التعطيل يمنع إصدار الأكواد وFirst Activation، ولا يلغي Grants قائمة.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-reason">سبب الإنشاء أو التعديل (داخلي)</Label>
            <Textarea id="plan-reason" name="reason" required minLength={5} maxLength={1000} rows={2} {...validation.getFieldProps("reason")} />
            <AdminFieldError id={validation.errorId("reason")} message={validation.fieldErrors.reason} />
          </div>
          {plan?.isActive && <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmContentChange" className="mt-1" />
            <span>أقر بأن تعطيل الخطة يوقف عمليات الشراء الجديدة، ولا يجعل المحتوى الموروث مجانيًا.</span>
          </label>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "جار الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

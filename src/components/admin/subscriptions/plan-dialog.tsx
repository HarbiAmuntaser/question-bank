"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";

import { createPaidAccessPlanAction, updatePaidAccessPlanAction, searchPaymentSubjectsAction } from "@/app/admin/subscriptions/actions";
import { AsyncCombobox, type ComboOption } from "@/components/admin/seo/AsyncCombobox";
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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState<ComboOption | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setSubject(plan?.subject ? { id: plan.subject.id, label: plan.subject.name, subLabel: plan.subject.universityName ?? undefined } : null);
  }, [open, plan]);

  function handleSubmit(formData: FormData) {
    formData.set("scopeType", "subject");
    formData.set("subjectId", subject?.id ?? "");
    if (!subject) {
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

        <form action={handleSubmit} className="space-y-5">
          {plan && <input type="hidden" name="expectedUpdatedAt" value={plan.updatedAt} />}
          <div className="space-y-2">
            <Label>المادة</Label>
            <AsyncCombobox value={subject} onChange={setSubject} fetcher={searchPaymentSubjectsAction}
              disabled={Boolean(plan)} disablePortal placeholder="ابحث عن مادة جامعية سعودية" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">عنوان الخطة</Label>
              <Input id="title" name="title" defaultValue={plan?.title ?? ""} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea id="description" name="description" defaultValue={plan?.description ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">السعر</Label>
              <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={plan?.price ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Input id="currency" name="currency" defaultValue={plan?.currency ?? "SAR"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDurationDays">مدة الاشتراك الافتراضية بالأيام</Label>
              <Input id="defaultDurationDays" name="defaultDurationDays" type="number" min="1" defaultValue={plan?.defaultDurationDays ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultMaxUses">عدد استخدامات الكود الافتراضي</Label>
              <Input id="defaultMaxUses" name="defaultMaxUses" type="number" min="1" defaultValue={plan?.defaultMaxUses ?? 1} />
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

          <div className="space-y-2">
            <Label htmlFor="plan-reason">سبب الإنشاء أو التعديل (داخلي)</Label>
            <Textarea id="plan-reason" name="reason" required minLength={5} maxLength={1000} rows={2} />
          </div>
          {plan?.isActive && <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmContentChange" className="mt-1" />
            <span>عند تعطيل الخطة، أقر بأن المحتوى الذي يرثها قد يصبح مجانيًا.</span>
          </label>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "جار الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

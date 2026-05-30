"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";
import type { AccessScopeType } from "@prisma/client";

import { createPaidAccessPlanAction, updatePaidAccessPlanAction } from "@/app/admin/subscriptions/actions";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function PlanDialog({ children, plan }: { children: React.ReactNode; plan?: PlanRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [scopeType, setScopeType] = useState<AccessScopeType>("subject");
  const [universityId, setUniversityId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const initialScope = plan?.scopeType ?? "subject";
    setScopeType(initialScope);
    setUniversityId(plan?.major?.universityId ?? plan?.subject?.universityId ?? "");
    setMajorId(plan?.majorId ?? plan?.subject?.majorId ?? "");
    setSubjectId(plan?.subjectId ?? "");
  }, [open, plan]);

  function handleSubmit(formData: FormData) {
    formData.set("scopeType", scopeType);
    formData.set("majorId", majorId);
    formData.set("subjectId", subjectId);

    if (scopeType === "major" && !majorId) {
      toast({ title: "خطأ", description: "اختيار التخصص مطلوب", variant: "destructive" });
      return;
    }
    if (scopeType === "subject" && !subjectId) {
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
          <DialogDescription>حدد نطاق الخطة ومعلومات التواصل التي ستظهر لاحقاً للطالب.</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>نطاق الخطة</Label>
              <Select
                value={scopeType}
                onValueChange={(value: AccessScopeType) => {
                  setScopeType(value);
                  setSubjectId("");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">تخصص</SelectItem>
                  <SelectItem value="subject">مقرر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الجامعة</Label>
              <AdminLookupCombobox
                type="university"
                value={universityId}
                onValueChange={(value) => {
                  setUniversityId(value);
                  setMajorId("");
                  setSubjectId("");
                }}
                placeholder="ابحث عن جامعة"
              />
            </div>

            <div className="space-y-2">
              <Label>التخصص</Label>
              <AdminLookupCombobox
                type="major"
                value={majorId}
                onValueChange={(value) => {
                  setMajorId(value);
                  setSubjectId("");
                }}
                universityId={universityId}
                disabled={!universityId}
                placeholder={universityId ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
              />
            </div>

            {scopeType === "subject" ? (
              <div className="space-y-2">
                <Label>المقرر</Label>
                <AdminLookupCombobox
                  type="subject"
                  value={subjectId}
                  onValueChange={setSubjectId}
                  majorId={majorId}
                  disabled={!majorId}
                  placeholder={majorId ? "ابحث عن مقرر" : "اختر التخصص أولاً"}
                />
              </div>
            ) : null}
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
            <Switch id="isActive" name="isActive" defaultChecked={plan?.isActive ?? true} />
            <Label htmlFor="isActive">الخطة نشطة</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "جار الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

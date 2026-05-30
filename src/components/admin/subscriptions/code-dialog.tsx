"use client";

import type React from "react";
import { useState, useTransition } from "react";

import { createSubscriptionCodeAction } from "@/app/admin/subscriptions/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function CodeDialog({ children, plans }: { children: React.ReactNode; plans: PlanRow[] }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSubmit(formData: FormData) {
    formData.set("planId", planId);
    if (!planId) {
      toast({ title: "خطأ", description: "اختيار الخطة مطلوب", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = await createSubscriptionCodeAction(formData);
      if (result.success) {
        setGeneratedCode(result.plainCode ?? "");
        toast({ title: "تم", description: result.message });
      } else {
        toast({ title: "خطأ", description: result.message, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء كود اشتراك</DialogTitle>
          <DialogDescription>سيظهر الكود الصريح مرة واحدة بعد الإنشاء حتى يتم نسخه وإرساله للطالب.</DialogDescription>
        </DialogHeader>

        {generatedCode ? (
          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <Label>الكود الصريح</Label>
            <Input value={generatedCode} readOnly dir="ltr" className="font-mono text-base" onFocus={(e) => e.currentTarget.select()} />
            <p className="text-sm text-muted-foreground">انسخ الكود الآن. بعد إغلاق النافذة سيظهر فقط جزء من الكود في الجدول.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setGeneratedCode("")}>إنشاء كود آخر</Button>
              <Button type="button" onClick={() => setOpen(false)}>تم</Button>
            </div>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>الخطة</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="اختر خطة" /></SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.title} - {plan.scopeType === "major" ? "تخصص" : "مقرر"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationDays">مدة الكود بالأيام</Label>
                <Input id="durationDays" name="durationDays" type="number" min="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">عدد الاستخدامات</Label>
                <Input id="maxUses" name="maxUses" type="number" min="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startsAt">يبدأ في</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">ينتهي في</Label>
                <Input id="expiresAt" name="expiresAt" type="datetime-local" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">ملاحظة داخلية</Label>
                <Textarea id="note" name="note" rows={3} />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending || !planId}>{pending ? "جار الإنشاء..." : "إنشاء الكود"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

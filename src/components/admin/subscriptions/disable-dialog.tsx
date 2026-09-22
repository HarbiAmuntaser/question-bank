"use client";

import { useId, useState, useTransition } from "react";
import { Power } from "lucide-react";
import { disableAccessEntitlementAction, disableSubscriptionCodeAction, disablePaidAccessPlanAction } from "@/app/admin/subscriptions/actions";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function DisableSubscriptionDialog({ kind, id, updatedAt, label, disabled }: {
  kind: "plan" | "code" | "entitlement"; id: string; updatedAt: string; label: string; disabled: boolean;
}) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState("");
  const [pending, startTransition] = useTransition(); const { toast } = useToast(); const fieldId = useId();
  const title = kind === "plan" ? "تعطيل الخطة" : kind === "code" ? "تعطيل الكود" : "تعطيل الاشتراك";
  function confirm() {
    startTransition(async () => {
      setError("");
      try {
        const action = kind === "plan" ? disablePaidAccessPlanAction : kind === "code" ? disableSubscriptionCodeAction : disableAccessEntitlementAction;
        const result = await action(id, { reason, expectedUpdatedAt: updatedAt, confirmContentChange: confirmed });
        if (!result.success) { setError(result.message); return; }
        toast({ title: "تم", description: result.message }); setOpen(false);
      } catch { setError("تعذر تنفيذ العملية. تحقق من الجلسة ثم أعد المحاولة."); }
    });
  }
  return <AlertDialog open={open} onOpenChange={(next) => {
    if (pending) return;
    setOpen(next); setReason(""); setConfirmed(false); setError("");
  }}>
    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={disabled} title={title} aria-label={title}><Power className="h-4 w-4" aria-hidden /></Button></AlertDialogTrigger>
    <AlertDialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{label}<br />
          {kind === "plan" ? "قد يصبح المحتوى الذي يرث هذه الخطة مجانيًا عند عدم وجود خطة نشطة أخرى."
            : kind === "code" ? "لن يقبل الكود تفعيلات جديدة. الاشتراكات الممنوحة سابقًا لا تتغير."
              : "سيتوقف الوصول الذي يمنحه هذا الاستحقاق. لا يتغير رصيد الطلب ولا يُسجل استرداد مالي."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-2"><Label htmlFor={fieldId}>سبب التعطيل (داخلي)</Label>
        <Textarea id={fieldId} value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={1000} rows={3} disabled={pending} />
      </div>
      {kind === "plan" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={pending} className="mt-1" /><span>أؤكد أثر تعطيل الخطة على إتاحة المحتوى.</span></label>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter className="gap-2"><AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
        <Button variant="destructive" onClick={confirm} disabled={pending || reason.trim().length < 5 || (kind === "plan" && !confirmed)}>{pending ? "جار التعطيل..." : "تأكيد التعطيل"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

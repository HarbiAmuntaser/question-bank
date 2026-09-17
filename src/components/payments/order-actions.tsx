"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { contactMethodLabels, type StudentOrder } from "@/lib/payment-orders";
import { orderErrorMessage, orderRequest, type OrderClientError } from "./order-client";

export function OrderActions({ order }: { order: StudentOrder }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<{ href: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const reviewAttempt = useRef<{ expectedVersion: number; idempotencyKey: string } | null>(null);
  async function act(action: "cancel" | "contact" | "review") {
    setBusy(true); setError(""); setHandoff(null);
    try {
      if (action === "review" && !reviewAttempt.current) reviewAttempt.current = { expectedVersion: order.reviewVersion, idempotencyKey: crypto.randomUUID() };
      const result = await orderRequest<{ href: string; message: string }>(`/${order.id}/${action}`, action === "review" ? reviewAttempt.current : {});
      if (action === "contact") setHandoff(result);
      if (action === "review") reviewAttempt.current = null;
      router.refresh();
    } catch (e) { if ((e as OrderClientError).code === "order_changed") reviewAttempt.current = null;
      setError(orderErrorMessage((e as OrderClientError).code)); router.refresh(); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!handoff) return;
    try { await navigator.clipboard.writeText(handoff.message); setCopied(true); }
    catch { setError("تعذر النسخ التلقائي. نص الرسالة متاح للتحديد."); }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3">{order.canContact && <Button className="gap-2" disabled={busy} onClick={() => act("contact")}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}متابعة عبر {contactMethodLabels[order.contactMethod]}</Button>}
      {order.canSubmitReview && <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={busy} className="gap-2"><Send className="h-4 w-4" />إرسال للمراجعة</Button></AlertDialogTrigger>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>إرسال الطلب للمراجعة؟</AlertDialogTitle><AlertDialogDescription>أؤكد إرسال تفاصيل التحويل عبر قناة التواصل. يبقى تفعيل المواد بانتظار اعتماد الإدارة.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>رجوع</AlertDialogCancel><AlertDialogAction onClick={() => act("review")}>تأكيد الإرسال</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
      {order.canCancel && <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={busy} className="gap-2"><X className="h-4 w-4" />إلغاء الطلب</Button></AlertDialogTrigger>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>إلغاء الطلب؟</AlertDialogTitle><AlertDialogDescription>{order.reference}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>رجوع</AlertDialogCancel><AlertDialogAction onClick={() => act("cancel")}>تأكيد الإلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
    </div>
    {handoff && order.canContact && <div className="space-y-3 border-t pt-4"><label htmlFor="order-contact-message" className="block text-sm font-medium">رسالة الطلب</label>
      <Textarea id="order-contact-message" value={handoff.message} readOnly rows={Math.min(order.items.length + 4, 10)} className="resize-y break-words" />
      <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={copy} className="gap-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "تم النسخ" : "نسخ الرسالة"}</Button>
        <Button asChild className="gap-2"><a href={handoff.href} target="_blank" rel="noopener noreferrer" onClick={(event) => {
          if (order.status === "pending_payment" && new Date(order.expiresAt).getTime() <= Date.now()) { event.preventDefault(); setHandoff(null); setError("انتهت صلاحية الطلب."); router.refresh(); }
        }}><ExternalLink className="h-4 w-4" />فتح {contactMethodLabels[order.contactMethod]}</a></Button></div></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

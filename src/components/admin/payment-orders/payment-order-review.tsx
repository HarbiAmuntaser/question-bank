"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2, Pencil, RotateCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { OrderItems } from "@/components/payments/order-items";
import { orderErrorMessage } from "@/components/payments/order-client";
import { orderMoney, orderStatusLabels } from "@/lib/payment-orders";
import { ledgerKindLabels, reviewActionLabels, type AdminOrder } from "@/lib/payment-reviews";
import { adminReviewSchema } from "@/validations/payment-review";

type Action = "receipt" | "refund" | "correction" | "submitted" | "additional_requested" | "approved" | "rejected" | "note";
export function PaymentOrderReview({ order }: { order: AdminOrder }) {
  const router = useRouter(); const [action, setAction] = useState<Action>("receipt");
  const [amount, setAmount] = useState(""); const [reference, setReference] = useState("");
  const [internalNote, setNote] = useState(""); const [studentMessage, setMessage] = useState("");
  const [entryId, setEntry] = useState(""); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState<Record<string, unknown> | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const disabled = busy || !order.reviewEnabled || order.status === "approved";
  const underReview = ["pending_review", "awaiting_additional_payment"].includes(order.status);
  const financial = ["receipt", "refund", "correction"].includes(action);
  const date = (value: string) => new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" });
  function prepare(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    const data = { action, expectedVersion: order.reviewVersion, internalNote, studentMessage,
      ...(financial ? { amount } : {}), ...(["receipt", "refund"].includes(action) ? { reference } : {}),
      ...(action === "correction" ? { entryId } : {}) };
    const fingerprint = JSON.stringify(data);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    const parsed = adminReviewSchema.safeParse({ ...data, idempotencyKey: attempt.current.key });
    if (!parsed.success) { setError(orderErrorMessage("invalid_payload")); return; }
    setConfirm(parsed.data);
  }
  async function execute() {
    if (!confirm || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/admin/payment-orders/${order.id}`, { method: "POST", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify(confirm) });
      const result = await response.json();
      if (!response.ok) {
        setError(orderErrorMessage(result?.error));
        if (response.status < 500) { attempt.current = null; router.refresh(); }
        return;
      }
      attempt.current = null;
      if (result.data.conflictCode) setError(orderErrorMessage(result.data.conflictCode));
      else { setSuccess("تم حفظ العملية."); setNote(""); setMessage(""); setAmount(""); setReference(""); setEntry(""); setAction("receipt"); }
      router.refresh();
    } catch { setError("تعذر التأكد من النتيجة. أعد محاولة العملية نفسها قبل تسجيل عملية أخرى."); }
    finally { setBusy(false); setConfirm(null); }
  }
  return <div dir="rtl" className="min-w-0 space-y-6">
    <header className="space-y-3"><Link href="/admin/payment-orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronRight className="h-4 w-4" />طلبات الدفع</Link>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">مراجعة طلب الدفع</h1><Button variant="outline" size="icon" aria-label="تحديث الطلب" title="تحديث الطلب" disabled={busy} onClick={() => router.refresh()}><RotateCw className="h-4 w-4" /></Button></div>
      <div className="flex flex-wrap items-center gap-3"><span dir="ltr" className="break-all font-mono text-sm">{order.reference}</span><Badge variant="secondary">{orderStatusLabels[order.status]}</Badge>{!order.reviewEnabled && <Badge variant="outline">المراجعة متوقفة</Badge>}</div>
    </header>
    <section className="grid min-w-0 gap-5 border-y py-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="min-w-0"><h2 className="mb-1 text-muted-foreground">الطالب</h2><p className="break-words">{order.student.name || "طالب"}</p><p dir="ltr" className="break-all text-right">{order.student.email}</p>{!order.student.isActive && <p className="text-destructive">الحساب معطل</p>}</div>
      <div><h2 className="mb-1 text-muted-foreground">الإجمالي</h2><p dir="ltr" className="text-right text-lg font-semibold tabular-nums">{orderMoney(order.total)}</p></div>
      <div><h2 className="mb-1 text-muted-foreground">صافي المبلغ الموثق</h2><p dir="ltr" className="text-right text-lg font-semibold tabular-nums">{orderMoney(order.verifiedAmount)}</p></div>
      <dl className="space-y-1"><div className="flex justify-between gap-3"><dt>المتبقي</dt><dd dir="ltr">{orderMoney(order.remainingAmount)}</dd></div><div className="flex justify-between gap-3"><dt>الزائد</dt><dd dir="ltr">{orderMoney(order.excessAmount)}</dd></div></dl>
    </section>
    <section className="space-y-3"><h2 className="text-base font-semibold">مواد الطلب</h2><OrderItems items={order.items} /></section>
    <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-muted-foreground"><div><dt>الإنشاء</dt><dd>{date(order.createdAt)}</dd></div><div><dt>مهلة الدفع الأصلية</dt><dd>{date(order.expiresAt)}</dd></div>{order.reviewStartedAt && <div><dt>بدء المراجعة</dt><dd>{date(order.reviewStartedAt)}</dd></div>}<div><dt>نسخة المراجعة</dt><dd>{order.reviewVersion}</dd></div></dl>
    {order.status !== "approved" && <section className="border-y py-5"><h2 id="review-form-title" className="mb-4 text-base font-semibold">عملية المراجعة</h2>
      <form onSubmit={prepare} aria-labelledby="review-form-title" className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div><label htmlFor="review-action" className="mb-1 block text-sm">العملية</label><select id="review-action" value={action} disabled={disabled} onChange={(e) => setAction(e.target.value as Action)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          <option value="receipt">توثيق دفعة مستلمة</option><option value="refund">توثيق رد مبلغ تم يدويًا</option>
          {entryId && <option value="correction">تصحيح سجل مالي</option>}
          {["pending_payment", "awaiting_additional_payment"].includes(order.status) && <option value="submitted">تسجيل استلام تفاصيل التحويل للمراجعة</option>}
          {underReview && <><option value="additional_requested">طلب استكمال المبلغ</option><option value="approved">اعتماد جميع المواد</option><option value="rejected">رفض الطلب</option><option value="note">إضافة ملاحظة</option></>}
        </select></div>
        {financial && <div><label htmlFor="review-amount" className="mb-1 block text-sm">{action === "correction" ? "القيمة الصحيحة (صفر لإبطال السجل)" : "المبلغ بالريال"}</label><Input id="review-amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={disabled} inputMode="decimal" dir="ltr" required maxLength={11} pattern="(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?" /></div>}
        {["receipt", "refund"].includes(action) && <div className="sm:col-span-2"><label htmlFor="review-reference" className="mb-1 block text-sm">مرجع التحويل (الجهة/المرجع)</label><Input id="review-reference" value={reference} onChange={(e) => setReference(e.target.value)} disabled={disabled} required minLength={3} maxLength={160} dir="ltr" pattern="[a-zA-Z0-9][a-zA-Z0-9:._/\-]*" /></div>}
        {action === "correction" && <p dir="ltr" className="break-all text-xs text-muted-foreground sm:col-span-2">{entryId}</p>}
        <div><label htmlFor="review-internal-note" className="mb-1 block text-sm">ملاحظة داخلية / سبب العملية</label><Textarea id="review-internal-note" value={internalNote} onChange={(e) => setNote(e.target.value)} required maxLength={2000} rows={3} disabled={disabled} /></div>
        <div><label htmlFor="review-student-message" className="mb-1 block text-sm">رسالة ظاهرة للطالب</label><Textarea id="review-student-message" value={studentMessage} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} disabled={disabled} required={["rejected", "additional_requested"].includes(action)} /></div>
        <div className="sm:col-span-2"><Button type="submit" disabled={disabled} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : action === "approved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}مراجعة العملية وتأكيدها</Button></div>
      </form></section>}
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}{success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
    {order.grants.length > 0 && <section className="space-y-3"><h2 className="text-base font-semibold">الاستحقاقات</h2>{order.grants.map((grant) => <div key={grant.entitlementId} className="flex flex-wrap justify-between gap-2 border-b pb-3 text-sm"><span>{order.items.find((item) => item.subjectId === grant.subjectId)?.subjectName}</span><span>{grant.isActive ? (grant.expiresAt ? date(grant.expiresAt) : "بلا انتهاء") : "معطل"}</span></div>)}</section>}
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">سجل المراجعات والدفعات</h2><Link href={`/admin/payment-orders/${order.id}`} className="text-sm text-primary">الأحدث</Link></div>
      {order.activity.length === 0 && <p className="py-6 text-sm text-muted-foreground">لا توجد مراجعات أو دفعات موثقة.</p>}
      <ol className="divide-y">{order.activity.map((event) => <li key={event.id} className="min-w-0 space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold">{reviewActionLabels[event.action]}</span><time className="text-xs text-muted-foreground">{date(event.createdAt)}</time></div>
        <p className="break-words text-xs text-muted-foreground">{event.actor} / {event.version}</p>
        {event.internalNote && <div><p className="mb-1 text-xs text-muted-foreground">داخلي</p><p className="whitespace-pre-wrap break-words text-sm">{event.internalNote}</p></div>}
        {event.studentMessage && <div className="border-r-2 border-emerald-600 pr-3"><p className="mb-1 text-xs text-muted-foreground">ظاهر للطالب</p><p className="whitespace-pre-wrap break-words text-sm">{event.studentMessage}</p></div>}
        {event.conflictCode && <p className="text-sm text-destructive">{orderErrorMessage(event.conflictCode)}</p>}
        {event.ledger.map((entry) => <div key={entry.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 text-sm">
          <div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap gap-3"><span>{ledgerKindLabels[entry.kind]}</span><span dir="ltr" className="tabular-nums">{orderMoney(entry.amount)}</span></div><p dir="ltr" className="break-all text-right font-mono text-xs">{entry.reference ?? entry.id}</p>{entry.sourceId && <p dir="ltr" className="break-all text-right text-xs text-muted-foreground">{entry.sourceId}</p>}</div>
          {entry.canCorrect && <Button type="button" size="icon" variant="outline" title="تصحيح السجل" aria-label={`تصحيح ${entry.reference ?? entry.id}`} disabled={disabled} onClick={() => { setEntry(entry.id); setAction("correction"); setAmount(String(Math.abs(Number(entry.amount)))); document.getElementById("review-action")?.focus(); document.getElementById("review-form-title")?.scrollIntoView({ block: "start", behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></Button>}
        </div>)}
      </li>)}</ol>{order.nextBefore && <Link className="inline-block text-sm text-primary" href={`/admin/payment-orders/${order.id}?before=${order.nextBefore}`}>مراجعات أقدم</Link>}
    </section>
    <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => { if (!busy && !open) setConfirm(null); }}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد {reviewActionLabels[action]}</AlertDialogTitle><AlertDialogDescription>{order.reference}{financial ? ` / ${amount} SAR` : ""}{action === "refund" ? " / أؤكد أن رد المبلغ تم فعليًا خارج الموقع." : action === "receipt" ? " / أؤكد التحقق من استلام المبلغ." : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>رجوع</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void execute(); }}>تأكيد العملية</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

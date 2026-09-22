"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ContactMethod } from "@prisma/client";
import { Loader2, Search, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderItems } from "./order-items";
import { OrderClientError, orderErrorMessage, orderRequest } from "./order-client";
import { contactMethodLabels, orderMoney, type OrderPlan, type OrderQuote, type StudentOrder } from "@/lib/payment-orders";

export function OrderComposer({ initialPlanIds }: { initialPlanIds: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState(initialPlanIds);
  const [query, setQuery] = useState(""); const [catalog, setCatalog] = useState<OrderPlan[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true); const [catalogError, setCatalogError] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null); const [quoting, setQuoting] = useState(false);
  const [method, setMethod] = useState<ContactMethod | "">("");
  const [error, setError] = useState(""); const [existingOrder, setExistingOrder] = useState<string>();
  const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0);
  const attemptKey = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setCatalogLoading(true); setCatalogError("");
    const timer = setTimeout(() => {
      orderRequest<OrderPlan[]>(`/catalog?q=${encodeURIComponent(query)}`, undefined, controller.signal).then(setCatalog)
        .catch((e) => { if (!controller.signal.aborted) setCatalogError(orderErrorMessage(e.code)); })
        .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => {
    const controller = new AbortController(); setQuote(null); setExistingOrder(undefined); attemptKey.current = null;
    if (!ids.length) { setQuoting(false); return () => controller.abort(); }
    setQuoting(true);
    orderRequest<OrderQuote>("/quote", { planIds: ids }, controller.signal).then((next) => {
      if (controller.signal.aborted) return;
      setQuote(next); setMethod((current) => current && next.methods.includes(current) ? current : next.methods[0] ?? "");
    }).catch((e) => { if (!controller.signal.aborted) setError(orderErrorMessage(e.code)); })
      .finally(() => { if (!controller.signal.aborted) setQuoting(false); });
    return () => controller.abort();
  }, [ids, revision]);
  function toggle(id: string) {
    if (busy) return; setError(""); setQuote(null); attemptKey.current = null;
    setIds((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 10 ? [...current, id] : current);
  }
  async function create() {
    if (!quote || !method || busy || quoting) return;
    setBusy(true); setError(""); setExistingOrder(undefined); attemptKey.current ??= crypto.randomUUID();
    try {
      const result = await orderRequest<{ order: StudentOrder }>("", { planIds: ids, contactMethod: method, quoteVersion: quote.version, idempotencyKey: attemptKey.current });
      router.push(`/account/orders/${result.order.id}`);
    } catch (e) {
      const failure = e as OrderClientError; setError(orderErrorMessage(failure.code));
      if (failure.code === "active_order_exists") setExistingOrder(failure.orderId);
      if (failure.code === "quote_changed") setRevision((value) => value + 1);
    } finally { setBusy(false); }
  }
  return <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section className="min-w-0 space-y-4" aria-labelledby="order-subjects"><h2 id="order-subjects" className="text-lg font-semibold">المواد</h2>
      <div className="relative"><Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input aria-label="البحث عن مادة" placeholder="اسم المادة" maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} className="pr-9" /></div>
      {catalogError && <p role="alert" className="text-sm text-destructive">{catalogError}</p>}
      <div className="h-96 overflow-y-auto overscroll-contain" aria-busy={catalogLoading}>{catalogLoading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" aria-label="جار تحميل المواد" /></div>
        : <ul className="divide-y border-y">{catalog.map((plan) => <li key={plan.planId} className="py-4">
          <label className="flex cursor-pointer items-start gap-3"><Checkbox aria-label={`اختيار ${plan.subjectName}`} className="mt-1"
            checked={ids.includes(plan.planId)} disabled={busy || (!ids.includes(plan.planId) && ids.length >= 10)} onCheckedChange={() => toggle(plan.planId)} />
            <span className="min-w-0 flex-1"><span className="block break-words font-medium">{plan.subjectName}</span>
              <span className="block break-words text-xs text-muted-foreground">{plan.universityName} · {plan.planTitle}</span>
              <span dir="ltr" className="mt-1 block text-right text-sm tabular-nums">{orderMoney(plan.price)}</span></span></label></li>)}</ul>}
        {!catalogLoading && !catalogError && catalog.length === 0 && <p className="py-8 text-sm text-muted-foreground">لا توجد مواد متاحة.</p>}</div>
    </section>
    <section className="min-w-0 space-y-4" aria-labelledby="order-review"><h2 id="order-review" className="text-lg font-semibold">تفاصيل الطلب <span className="text-sm text-muted-foreground">({ids.length}/10)</span></h2>
      <div className="flex flex-wrap gap-2">{ids.map((id) => <div key={id} className="flex max-w-full items-center gap-1 border-b text-sm">
        <span className="min-w-0 break-words">{quote?.items.find((item) => item.planId === id)?.subjectName ?? catalog.find((item) => item.planId === id)?.subjectName ?? "مادة مختارة"}</span>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="إزالة المادة" aria-label="إزالة المادة" disabled={busy} onClick={() => toggle(id)}><X className="h-4 w-4" /></Button></div>)}</div>
      {quoting && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />جار حساب الإجمالي...</p>}
      {quote && <><OrderItems items={quote.items} /><div className="flex items-center justify-between gap-3 text-lg font-semibold"><span>الإجمالي</span><span dir="ltr" className="tabular-nums">{orderMoney(quote.total)}</span></div>
        <p className="text-sm text-muted-foreground">صلاحية الطلب: {quote.validForHours} ساعة من الإنشاء</p>
        <fieldset className="space-y-3" disabled={busy}><legend className="mb-2 text-sm font-medium">قناة التواصل</legend>
          {quote.methods.map((value) => <label key={value} className="flex items-center gap-2"><input type="radio" name="contactMethod" value={value} checked={method === value}
            onChange={() => { setMethod(value); attemptKey.current = null; }} className="h-4 w-4 accent-primary" />{contactMethodLabels[value]}</label>)}
          {!quote.methods.length && <p className="text-sm text-amber-700 dark:text-amber-400">لا توجد قناة تواصل مشتركة للمواد المختارة.</p>}</fieldset></>}
      {!ids.length && <p className="py-4 text-sm text-muted-foreground">الطلب فارغ.</p>}
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {existingOrder && <Button asChild variant="outline"><Link href={`/account/orders/${existingOrder}`}>عرض الطلب الموجود</Link></Button>}
      <Button type="button" className="h-11 w-full gap-2" disabled={!quote || !method || quoting || busy} onClick={create}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}{busy ? "جار حفظ الطلب..." : "تأكيد وإنشاء الطلب"}</Button>
    </section>
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudentAccount } from "@/lib/auth-helpers";
import { getOrder, OrderError } from "@/lib/server/payment-orders";
import { orderIdSchema } from "@/validations/payment-order";
import { contactMethodLabels, orderMoney, orderStatusLabels } from "@/lib/payment-orders";
import { OrderItems } from "@/components/payments/order-items";
import { OrderActions } from "@/components/payments/order-actions";
import { Badge } from "@/components/ui/badge";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStudentAccount(`/account/orders/${encodeURIComponent(id)}`);
  if (!orderIdSchema.safeParse(id).success) notFound();
  const order = await getOrder(id).catch((error) => { if (error instanceof OrderError && error.status === 404) notFound(); throw error; });
  const date = (value: string) => new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" });
  return <div className="max-w-3xl space-y-6"><header className="space-y-3"><h1 className="text-2xl font-bold">تفاصيل الطلب</h1>
    <div className="flex flex-wrap items-center gap-3"><span dir="ltr" className="break-all font-mono text-base">{order.reference}</span><Badge variant="secondary">{orderStatusLabels[order.status]}</Badge></div></header>
    <dl className="grid gap-4 border-y py-5 text-sm sm:grid-cols-3"><div><dt className="mb-1 text-muted-foreground">تاريخ الإنشاء</dt><dd>{date(order.createdAt)}</dd></div>
      <div><dt className="mb-1 text-muted-foreground">{order.reviewStartedAt ? "بدء المراجعة" : "مهلة الدفع"}</dt><dd>{date(order.reviewStartedAt ?? order.expiresAt)}</dd></div><div><dt className="mb-1 text-muted-foreground">قناة التواصل</dt><dd>{contactMethodLabels[order.contactMethod]}</dd></div></dl>
    <OrderItems items={order.items} /><div className="flex justify-between gap-4 text-lg font-semibold"><span>الإجمالي</span><span dir="ltr" className="tabular-nums">{orderMoney(order.total)}</span></div>
    <dl className="grid grid-cols-1 gap-4 border-y py-4 text-sm sm:grid-cols-3">
      <div><dt className="text-muted-foreground">صافي المبلغ الموثق</dt><dd dir="ltr" className="mt-1 text-right font-semibold tabular-nums">{orderMoney(order.verifiedAmount)}</dd></div>
      <div><dt className="text-muted-foreground">المبلغ المتبقي</dt><dd dir="ltr" className="mt-1 text-right font-semibold tabular-nums">{orderMoney(order.remainingAmount)}</dd></div>
      <div><dt className="text-muted-foreground">مبلغ زائد للتسوية</dt><dd dir="ltr" className="mt-1 text-right font-semibold tabular-nums">{orderMoney(order.excessAmount)}</dd></div>
    </dl>
    {order.messages.length > 0 && <section className="space-y-3"><h2 className="text-base font-semibold">رسائل الإدارة</h2>{order.messages.map((message) => <div key={message.id} className="border-b pb-3"><p className="whitespace-pre-wrap break-words text-sm">{message.text}</p><time className="mt-1 block text-xs text-muted-foreground">{date(message.createdAt)}</time></div>)}</section>}
    <OrderActions key={order.id} order={order} /><Link href="/account/orders" className="inline-block text-sm text-primary">جميع الطلبات</Link>
  </div>;
}

import Link from "next/link";
import { Plus, ChevronLeft } from "lucide-react";
import { requireStudentAccount } from "@/lib/auth-helpers";
import { listOrders } from "@/lib/server/payment-orders";
import { paymentSalesEnabled } from "@/lib/server/payment-scope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { orderMoney, orderStatusLabels } from "@/lib/payment-orders";
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requireStudentAccount("/account/orders");
  const params = await searchParams;
  const result = await listOrders(params.cursor ? { cursor: params.cursor } : {});
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">طلبات الاشتراك</h1>
    {paymentSalesEnabled() && <Button asChild className="gap-2"><Link href="/account/orders/new"><Plus className="h-4 w-4" />طلب جديد</Link></Button>}</header>
    {result.items.length ? <ul className="divide-y border-y">{result.items.map((order) => <li key={order.id}><Link href={`/account/orders/${order.id}`} className="flex min-w-0 items-center gap-3 py-5 hover:bg-muted/30">
      <div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap items-center gap-3"><span dir="ltr" className="font-mono text-sm">{order.reference}</span><Badge variant="secondary">{orderStatusLabels[order.status]}</Badge></div>
        <p className="break-words text-sm">{order.items.map((item) => item.subjectName).join("، ")}</p><div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span dir="ltr" className="tabular-nums">{orderMoney(order.total)}</span><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" })}</time></div></div>
      <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden /></Link></li>)}</ul>
      : <p className="border-y py-12 text-center text-muted-foreground">لا توجد طلبات.</p>}
    {result.nextCursor && <Button asChild variant="outline"><Link href={`/account/orders?cursor=${encodeURIComponent(result.nextCursor)}`}>طلبات أقدم</Link></Button>}
    {params.cursor && <Link href="/account/orders" className="block text-sm text-primary">أحدث الطلبات</Link>}
  </div>;
}

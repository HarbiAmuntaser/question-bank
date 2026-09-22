import { requireAdminPage } from "@/lib/server/admin-page-auth";
import Link from "next/link";
import { Search } from "lucide-react";
import { listAdminOrders } from "@/lib/server/payment-reviews";
import { adminOrderListSchema } from "@/validations/payment-review";
import { orderMoney, orderStatusLabels } from "@/lib/payment-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
export const dynamic = "force-dynamic";
export const metadata = { title: "طلبات الدفع", robots: { index: false, follow: false } };
export default async function PaymentOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("subscriptions:manage");
  const parsed = adminOrderListSchema.safeParse(await searchParams);
  const result = await listAdminOrders(parsed.success ? parsed.data : {});
  const pageHref = (page: number) => `/admin/payment-orders?${new URLSearchParams({ q: result.q, status: result.status, page: String(page) })}`;
  return <div className="min-w-0 space-y-5" dir="rtl"><h1 className="text-2xl font-semibold">طلبات الدفع</h1>
    <form className="flex flex-wrap items-end gap-3 border-y py-4"><div className="min-w-0 flex-1 basis-56"><label className="mb-1 block text-sm" htmlFor="order-search">رقم الطلب أو الطالب</label><Input id="order-search" name="q" defaultValue={result.q} maxLength={160} /></div>
      <div><label htmlFor="order-status" className="mb-1 block text-sm">الحالة</label><select id="order-status" name="status" defaultValue={result.status} className="h-10 max-w-full rounded-md border bg-background px-3 text-sm"><option value="all">جميع الحالات</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <Button type="submit" className="gap-2"><Search className="h-4 w-4" />بحث</Button></form>
    {!result.items.length && <p className="py-12 text-center text-sm text-muted-foreground">لا توجد طلبات مطابقة.</p>}
    <div className="divide-y">{result.items.map((order) => <Link key={order.id} href={`/admin/payment-orders/${order.id}`} className="grid min-w-0 gap-3 py-4 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-2"><p dir="ltr" className="break-all text-right font-mono text-sm">{order.reference}</p><Badge variant="secondary">{orderStatusLabels[order.status]}</Badge></div>
      <div className="min-w-0 text-sm"><p className="break-words">{order.student.name || "طالب"}</p><p dir="ltr" className="break-all text-right text-muted-foreground">{order.student.email}</p><p className="mt-1 text-xs text-muted-foreground">{order.items.length} مواد</p></div>
      <dl className="space-y-1 text-sm"><div className="flex justify-between gap-4"><dt>الإجمالي</dt><dd dir="ltr">{orderMoney(order.total)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">الموثق</dt><dd dir="ltr">{orderMoney(order.verifiedAmount)}</dd></div></dl>
    </Link>)}</div>
    <nav aria-label="صفحات الطلبات" className="flex items-center gap-4 border-t pt-4 text-sm">{result.page > 1 && <Link href={pageHref(result.page - 1)}>السابق</Link>}<span>صفحة {result.page}</span>{result.hasNext && <Link href={pageHref(result.page + 1)}>التالي</Link>}</nav>
  </div>;
}

import { requireStudentAccount } from "@/lib/auth-helpers";
import Link from "next/link";
import { paymentSalesEnabled } from "@/lib/server/payment-scope";
import { OrderComposer } from "@/components/payments/order-composer";
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ planId?: string | string[] }> }) {
  const params = await searchParams;
  const ids = [...new Set(Array.isArray(params.planId) ? params.planId : params.planId ? [params.planId] : [])];
  const query = new URLSearchParams(); ids.slice(0, 10).forEach((id) => query.append("planId", id));
  await requireStudentAccount(`/account/orders/new${query.size ? `?${query}` : ""}`);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">طلب اشتراك جديد</h1>
    {!paymentSalesEnabled() ? <div className="space-y-4 border-y py-8"><p role="status" className="text-muted-foreground">إنشاء الطلبات الجديدة متوقف حاليًا. لطلب كود تفعيل، افتح المادة واختر خطة الوصول.</p>
      <Link href="/account/orders" className="block text-sm text-primary hover:underline">متابعة طلباتي السابقة</Link></div>
      : ids.length > 10 || ids.some((id) => !id || id.length > 100) ? <p role="alert">بيانات المواد غير صالحة.</p> : <OrderComposer initialPlanIds={ids} />}</div>;
}

import { requireStudentAccount } from "@/lib/auth-helpers";
import { paymentSalesEnabled } from "@/lib/server/payment-scope";
import { OrderComposer } from "@/components/payments/order-composer";
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ planId?: string | string[] }> }) {
  const params = await searchParams;
  const ids = [...new Set(Array.isArray(params.planId) ? params.planId : params.planId ? [params.planId] : [])];
  const query = new URLSearchParams(); ids.slice(0, 10).forEach((id) => query.append("planId", id));
  await requireStudentAccount(`/account/orders/new${query.size ? `?${query}` : ""}`);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">طلب اشتراك جديد</h1>
    {!paymentSalesEnabled() ? <p role="status" className="border-y py-8 text-muted-foreground">إنشاء الطلبات غير متاح حاليًا.</p>
      : ids.length > 10 || ids.some((id) => !id || id.length > 100) ? <p role="alert">بيانات المواد غير صالحة.</p> : <OrderComposer initialPlanIds={ids} />}</div>;
}

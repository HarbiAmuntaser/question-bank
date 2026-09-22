import { requireAdminPage } from "@/lib/server/admin-page-auth";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/server/payment-reviews";
import { OrderError } from "@/lib/server/payment-orders";
import { orderIdSchema } from "@/validations/payment-order";
import { reviewHistorySchema } from "@/validations/payment-review";
import { PaymentOrderReview } from "@/components/admin/payment-orders/payment-order-review";
export const dynamic = "force-dynamic";
export const metadata = { title: "مراجعة طلب الدفع", robots: { index: false, follow: false } };
export default async function PaymentOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("subscriptions:manage");
  const { id } = await params;
  if (!orderIdSchema.safeParse(id).success) notFound();
  const query = reviewHistorySchema.safeParse(await searchParams);
  const order = await getAdminOrder(id, query.success ? query.data : {}).catch((error) => { if (error instanceof OrderError && error.status === 404) notFound(); throw error; });
  return <PaymentOrderReview order={order} />;
}

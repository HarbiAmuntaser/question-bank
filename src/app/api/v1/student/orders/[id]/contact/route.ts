import { orderHttp } from "@/lib/server/payment-order-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return orderHttp(req, "contact", (await context.params).id);
}

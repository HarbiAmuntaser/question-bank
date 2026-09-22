import { orderHttp } from "@/lib/server/payment-order-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  return orderHttp(req, "get", (await context.params).id);
}

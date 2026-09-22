import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { adminReviewHttp } from "@/lib/server/payment-review-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  return adminReviewHttp(req, auth.userId, (await context.params).id);
}
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  return adminReviewHttp(req, auth.userId, (await context.params).id);
}

import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { adminReviewHttp } from "@/lib/server/payment-review-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  return adminReviewHttp(req, auth.userId);
}

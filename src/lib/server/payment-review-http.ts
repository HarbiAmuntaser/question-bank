import "server-only";
import { ZodError } from "zod";
import { AuthRateLimitError, consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { paymentJson, readPaymentBody, requirePaymentOrigin } from "@/lib/server/payment-http";
import { PaymentError, requirePaymentReview } from "@/lib/server/payment-scope";
import { getAdminOrder, listAdminOrders, reviewOrder } from "@/lib/server/payment-reviews";

export async function adminReviewHttp(req: Request, actorId: string, id?: string) {
  try {
    const write = req.method === "POST";
    if (write) { requirePaymentReview(); requirePaymentOrigin(req); }
    await consumeAuthLimit("payment-review-ip", requestIdentity(req.headers), 120, 60);
    await consumeAuthLimit(write ? "payment-review-admin:write" : "payment-review-admin:read", actorId, write ? 60 : 120, write ? 900 : 60);
    if (write) return paymentJson({ data: await reviewOrder(id ?? "", await readPaymentBody(req)) });
    const query = Object.fromEntries(new URL(req.url).searchParams);
    return paymentJson({ data: id ? await getAdminOrder(id, query) : await listAdminOrders(query) });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson({ error: error.code }, error.status);
    if (error instanceof ZodError) return paymentJson({ error: "invalid_payload" }, 400);
    if (error instanceof AuthRateLimitError) return paymentJson({ error: "too_many_requests" }, 429, { "Retry-After": String(error.retryAfter) });
    console.error("payment_review_failed", { write: req.method === "POST" });
    return paymentJson({ error: "payment_temporarily_unavailable" }, 503);
  }
}

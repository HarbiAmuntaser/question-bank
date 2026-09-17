import "server-only";
import { ZodError } from "zod";
import { authOrigin } from "@/lib/server/auth-config";
import { AuthRateLimitError, consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { PaymentError, requirePaymentStudent, requirePaymentCodes } from "@/lib/server/payment-scope";
import { redeemSubscriptionCode } from "@/lib/server/payment-mutations";
import { checkScopeAccess } from "@/lib/server/access-control";

export function paymentJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", ...extra } });
}
export async function readPaymentBody(req: Request) {
  if (!req.body) throw new PaymentError("invalid_payload");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); throw new PaymentError("payload_too_large", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new PaymentError("invalid_payload"); }
}

export function requirePaymentOrigin(req: Request) {
  if (req.headers.get("origin") !== authOrigin() || ["cross-site", "same-site"].includes(req.headers.get("sec-fetch-site") ?? "")) throw new PaymentError("forbidden", 403);
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new PaymentError("invalid_content_type", 415);
}

export async function paymentPost(req: Request) {
  try {
    requirePaymentCodes();
    requirePaymentOrigin(req);
    await consumeAuthLimit("payment-ip:redeem", requestIdentity(req.headers), 30, 900);
    const user = await requirePaymentStudent();
    await consumeAuthLimit("payment-user:redeem", user.id, 10, 900);
    const body = await readPaymentBody(req);
    const redeemed = await redeemSubscriptionCode(body);
    const access = await checkScopeAccess({ subjectId: redeemed.entitlement.subjectId });
    return paymentJson({ data: { ...redeemed, redeemed: true, access } });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson({ error: error.code, code: error.code }, error.status);
    if (error instanceof ZodError) return paymentJson({ error: "invalid_payload" }, 400);
    if (error instanceof AuthRateLimitError) return paymentJson({ error: "too_many_requests" }, 429, { "Retry-After": String(error.retryAfter) });
    console.error("payment_redeem_failed");
    return paymentJson({ error: "payment_temporarily_unavailable" }, 503);
  }
}

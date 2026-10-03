import "server-only";
import { ZodError } from "zod";
import { authOrigin } from "@/lib/server/auth-config";
import { AuthRateLimitError, consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { activateCodeAccess } from "@/lib/server/code-access";
import {
  activeGuestAccessTokenFromRequest,
  deriveGuestAccessToken,
  guestAccessCookieHeader,
} from "@/lib/server/code-access-cookie";
import { checkQuizAccess, checkScopeAccess } from "@/lib/server/access-control";
import { PaymentError, getPaymentStudent, requirePaymentCodes } from "@/lib/server/payment-scope";
import { hashSubscriptionCode } from "@/lib/server/subscription-code";
import { activateCodeAccessSchema } from "@/validations/payment";

export function paymentJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", ...extra } });
}

type PublicCodeAccessSupport = {
  supportReference: string | null;
  whatsappNumber: string | null;
  maxBrowserSessions: number;
  retryAfterSeconds: number | null;
};

function publicCodeAccessSupport(error: PaymentError): PublicCodeAccessSupport | null {
  if (!["browser_limit_reached", "transfer_support_required", "transfer_too_soon"].includes(error.code)) return null;
  const raw = (error as PaymentError & { publicDetails?: unknown }).publicDetails;
  if (!raw || typeof raw !== "object") return null;
  const details = raw as Record<string, unknown>;
  const supportReference = typeof details.supportReference === "string" && /^AC-[A-Z2-9]{12}$/.test(details.supportReference)
    ? details.supportReference
    : null;
  const whatsappNumber = typeof details.whatsappNumber === "string" && /^\+?\d{6,20}$/.test(details.whatsappNumber)
    ? details.whatsappNumber
    : null;
  const maxBrowserSessions = typeof details.maxBrowserSessions === "number" && Number.isInteger(details.maxBrowserSessions) && details.maxBrowserSessions >= 1 && details.maxBrowserSessions <= 100
    ? details.maxBrowserSessions
    : 1;
  const retryAfterSeconds = typeof details.retryAfterSeconds === "number" && Number.isInteger(details.retryAfterSeconds) && details.retryAfterSeconds >= 1 && details.retryAfterSeconds <= 600
    ? details.retryAfterSeconds
    : null;
  return { supportReference, whatsappNumber, maxBrowserSessions, retryAfterSeconds };
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
    const identity = requestIdentity(req.headers);
    await consumeAuthLimit("code-access-ip", identity, 30, 900);
    const input = activateCodeAccessSchema.parse(await readPaymentBody(req));
    await consumeAuthLimit("code-access-code", hashSubscriptionCode(input.code), 10, 900);

    const user = await getPaymentStudent();
    if (user) await consumeAuthLimit("code-access-user", user.id, 10, 900);
    if (user && input.operation !== "activate") throw new PaymentError("invalid_code_access_operation", 409);

    const existingGuestToken = user ? null : await activeGuestAccessTokenFromRequest(req);
    if (input.quizId) {
      const target = await checkQuizAccess({ quizId: input.quizId, guestSessionToken: existingGuestToken });
      if (target.subjectId !== input.subjectId || ["not_found", "missing_context", "out_of_scope"].includes(target.reason)) {
        throw new PaymentError("payment_target_mismatch", 409);
      }
    }

    const guestToken = user
      ? null
      : existingGuestToken ?? deriveGuestAccessToken(input);
    const activated = await activateCodeAccess({
      code: input.code,
      subjectId: input.subjectId,
      idempotencyKey: input.idempotencyKey,
      operation: input.operation,
      principal: user
        ? { type: "account", user: { id: user.id, sessionVersion: user.sessionVersion } }
        : { type: "guest", sessionToken: guestToken },
    });
    const access = await checkScopeAccess({
      subjectId: activated.grant.subjectId,
      guestSessionToken: user ? null : activated.guestSessionToken,
    });
    const response = paymentJson({ data: {
      activated: !activated.alreadyActive,
      alreadyRedeemed: activated.alreadyActive,
      outcome: activated.outcome,
      grant: activated.grant,
      plan: activated.plan,
      codePreview: activated.codePreview,
      supportReference: activated.supportReference,
      access,
    } });
    if (activated.guestSessionToken && activated.guestSessionExpiresAt) {
      response.headers.append("Set-Cookie", guestAccessCookieHeader(
        activated.guestSessionToken,
        activated.guestSessionExpiresAt,
      ));
    }
    return response;
  } catch (error) {
    if (error instanceof PaymentError) {
      const support = publicCodeAccessSupport(error);
      return paymentJson(
        { error: error.code, code: error.code, ...(support ? { support } : {}) },
        error.status,
        support?.retryAfterSeconds ? { "Retry-After": String(support.retryAfterSeconds) } : {},
      );
    }
    if (error instanceof ZodError) return paymentJson({ error: "invalid_payload" }, 400);
    if (error instanceof AuthRateLimitError) return paymentJson({ error: "too_many_requests" }, 429, { "Retry-After": String(error.retryAfter) });
    console.error("code_access_http_failed");
    return paymentJson({ error: "payment_temporarily_unavailable" }, 503);
  }
}

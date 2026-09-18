import "server-only";
import type { ZodType } from "zod";
import { authOrigin, mailConfig, registrationConfigured } from "@/lib/server/auth-config";
import { AuthRateLimitError, consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { registerSchema, emailRequestSchema, verifyEmailSchema, resetPasswordSchema } from "@/validations/student-auth";
import { consumeStudentToken, InvalidAuthTokenError, registerStudent, requestStudentEmail } from "@/lib/server/student-accounts";
import { safeAuthErrorFields, type AuthFailureStage } from "@/lib/server/student-auth-diagnostic";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
function json(body: unknown, status = 200, extra: Record<string, string> = {}) { return Response.json(body, { status, headers: { ...headers, ...extra } }); }
async function readJson(req: Request): Promise<unknown> {
  if (!req.body) throw new Error("invalid_body");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); throw new Error("invalid_body"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function studentAuthPost(req: Request, action: string) {
  const schemas: Record<string, ZodType> = { register: registerSchema, "resend-verification": emailRequestSchema, "forgot-password": emailRequestSchema, "verify-email": verifyEmailSchema, "reset-password": resetPasswordSchema };
  if (!Object.hasOwn(schemas, action)) return json({ error: "not_found" }, 404);
  const stagingDiagnostic = action === "resend-verification" && process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "payment-staging";
  let diagnosticStage: AuthFailureStage = "config";
  try {
    if (req.headers.get("origin") !== authOrigin() || ["cross-site", "same-site"].includes(req.headers.get("sec-fetch-site") ?? "")) return json({ error: "forbidden" }, 403);
    if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ error: "invalid_content_type" }, 415);
    if (action === "register" && !registrationConfigured()) return json({ error: "registration_closed" }, 503);
    const sendsEmail = ["register", "resend-verification", "forgot-password"].includes(action);
    if (sendsEmail) mailConfig();
    diagnosticStage = "rate_limit";
    await consumeAuthLimit("auth-ip:" + action, requestIdentity(req.headers), sendsEmail ? 20 : 30, 900);
    let body: unknown;
    try { body = await readJson(req); } catch { return json({ error: "invalid_request" }, 400); }
    const parsed = schemas[action].safeParse(body);
    if (!parsed.success) return json({ error: "validation_error", fields: parsed.error.flatten().fieldErrors }, 400);
    if (action === "register") {
      const input = registerSchema.parse(body);
      await consumeAuthLimit("auth-mail", input.email, 3, 3600);
      await registerStudent(input);
    } else if (action === "forgot-password" || action === "resend-verification") {
      const input = emailRequestSchema.parse(body);
      await consumeAuthLimit("auth-mail", input.email, 3, 3600);
      diagnosticStage = "user_lookup";
      await requestStudentEmail(input.email, action === "forgot-password" ? "reset_password" : "verify_email", input.callbackUrl,
        stagingDiagnostic ? (stage) => { diagnosticStage = stage; } : undefined);
    } else {
      const input = action === "verify-email" ? verifyEmailSchema.parse(body) : resetPasswordSchema.parse(body);
      await consumeAuthLimit("auth-token", input.token, 8, 900);
      const callbackUrl = await consumeStudentToken(input.token, action === "verify-email" ? "verify_email" : "reset_password", input.password);
      return json({ ok: true, callbackUrl });
    }
    return json({ ok: true }, 202);
  } catch (error) {
    if (error instanceof AuthRateLimitError) return json({ error: "too_many_requests" }, 429, { "Retry-After": String(error.retryAfter) });
    if (error instanceof InvalidAuthTokenError) return json({ error: "invalid_or_expired_token" }, 400);
    if (stagingDiagnostic) {
      console.error("student_auth_staging_diagnostic", { action, stage: diagnosticStage, ...safeAuthErrorFields(error) });
    } else {
      console.error("student_auth_unavailable", { action });
    }
    return json({ error: "temporarily_unavailable" }, 503);
  }
}

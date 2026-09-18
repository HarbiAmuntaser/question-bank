// Temporary payment-staging diagnostic. Remove after the resend failure is identified.
export type AuthFailureStage =
  | "config" | "rate_limit" | "user_lookup" | "token_create" | "token_cleanup"
  | "smtp_connect" | "smtp_tls" | "smtp_auth" | "smtp_sender"
  | "smtp_recipient" | "smtp_timeout" | "unknown";

const SAFE_CODES = new Set([
  "EAUTH", "ETIMEDOUT", "ECONNECTION", "ESOCKET", "ETLS", "EENVELOPE",
  "EMESSAGE", "EDNS", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN",
  "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function fields(error: unknown): { code?: string; responseCode?: number; command?: string; message?: string } {
  return error !== null && typeof error === "object" ? error : {};
}

export function classifySmtpFailure(error: unknown): AuthFailureStage {
  const { code, command, message } = fields(error);
  if (["auth_mail_not_configured", "auth_origin_invalid", "auth_https_required"].includes(message ?? "")) return "config";
  if (code === "ETIMEDOUT") return "smtp_timeout";
  if (code === "EAUTH" || /^AUTH(?:\s|$)/i.test(command ?? "")) return "smtp_auth";
  if (code === "ETLS" || code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      code === "ERR_TLS_CERT_ALTNAME_INVALID" || /^STARTTLS(?:\s|$)/i.test(command ?? "")) return "smtp_tls";
  if (/^MAIL FROM(?:\s|$)/i.test(command ?? "")) return "smtp_sender";
  if (/^RCPT TO(?:\s|$)/i.test(command ?? "")) return "smtp_recipient";
  if (["ECONNECTION", "ESOCKET", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EDNS"].includes(code ?? "")) return "smtp_connect";
  return "unknown";
}

export function safeAuthErrorFields(error: unknown): { code?: string; responseCode?: number } {
  const { code, responseCode } = fields(error);
  return {
    ...(code && SAFE_CODES.has(code) ? { code } : {}),
    ...(Number.isInteger(responseCode) && responseCode! >= 400 && responseCode! <= 599 ? { responseCode } : {}),
  };
}

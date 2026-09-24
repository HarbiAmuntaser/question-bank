import "server-only";

export function authOrigin(): string {
  const url = new URL(process.env.NEXTAUTH_URL ?? "");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("auth_origin_invalid");
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("auth_https_required");
  }
  return url.origin;
}

export function mailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from || /[\r\n]/.test(from)) throw new Error("auth_mail_not_configured");
  authOrigin();
  return { host, port, secure: port === 465, requireTLS: true, auth: { user, pass }, from };
}

export function registrationConfigured(): boolean {
  if (!studentRegistrationEnabled()) return false;
  try {
    mailConfig();
    return Boolean(process.env.NEXTAUTH_SECRET && process.env.DATABASE_URL);
  } catch {
    return false;
  }
}

export function studentRegistrationEnabled(): boolean {
  return process.env.STUDENT_REGISTRATION_ENABLED === "true";
}

export function googleAuthConfig(): { clientId: string; clientSecret: string } | null {
  if (process.env.GOOGLE_AUTH_ENABLED !== "true") return null;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret || /[\r\n]/.test(clientId + clientSecret)) return null;
  return { clientId, clientSecret };
}

export function googleAuthConfigured(): boolean {
  return googleAuthConfig() !== null;
}

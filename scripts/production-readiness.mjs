import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const CLOSED_FLAGS = [
  "STUDENT_REGISTRATION_ENABLED",
  "GOOGLE_AUTH_ENABLED",
  "PAYMENT_V1_ENABLED",
  "PAYMENT_REVIEW_ENABLED",
  "PAYMENT_CODES_ENABLED",
];

const R2_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_PUBLIC_BUCKET",
  "R2_PRIVATE_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "R2_SIGNED_URL_TTL_SECONDS",
];

function value(env, key) {
  return typeof env[key] === "string" ? env[key].trim() : "";
}

function safeUrl(raw, protocols) {
  try {
    const parsed = new URL(raw);
    if (!protocols.includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function validOrigin(raw) {
  const parsed = safeUrl(raw, ["https:"]);
  return parsed && parsed.pathname === "/" && !parsed.search && !parsed.hash ? parsed : null;
}

function validDatabaseUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.username || !parsed.password || parsed.pathname.length < 2) return null;
    if (!["require", "verify-full"].includes(parsed.searchParams.get("sslmode") ?? "")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizedDatabaseHost(hostname) {
  return hostname.replace(/-pooler(?=\.)/, "");
}

function validSender(raw) {
  if (!raw || /[\r\n]/.test(raw)) return false;
  const address = raw.match(/<([^<>]+)>$/)?.[1] ?? raw;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address);
}

export function evaluateClosedReadiness(env = process.env) {
  const checks = [];
  const add = (id, status, message) => checks.push({ id, status, message });

  add("node_environment", value(env, "NODE_ENV") === "production" ? "pass" : "fail", "NODE_ENV must be production for this preflight.");

  for (const key of CLOSED_FLAGS) {
    add(`closed_${key.toLowerCase()}`, value(env, key) === "false" ? "pass" : "fail", `${key} must be exactly false.`);
  }

  try {
    const ids = JSON.parse(value(env, "PAYMENT_LAUNCH_PLAN_IDS"));
    add("closed_launch_plan_ids", Array.isArray(ids) && ids.length === 0 ? "pass" : "fail", "PAYMENT_LAUNCH_PLAN_IDS must be an empty JSON array.");
  } catch {
    add("closed_launch_plan_ids", "fail", "PAYMENT_LAUNCH_PLAN_IDS must be valid JSON containing an empty array.");
  }

  const origin = validOrigin(value(env, "NEXTAUTH_URL"));
  add("https_auth_origin", origin ? "pass" : "fail", "NEXTAUTH_URL must be one credential-free HTTPS origin with no path, query or fragment.");

  const authSecret = value(env, "NEXTAUTH_SECRET");
  const secretReady = authSecret.length >= 32 && !/^(test|change|replace|secret|example)/i.test(authSecret);
  add("auth_secret", secretReady ? "pass" : "fail", "NEXTAUTH_SECRET must be a non-placeholder secret of at least 32 characters.");

  const googleEnabled = value(env, "GOOGLE_AUTH_ENABLED") === "true";
  const googleReady = !googleEnabled || Boolean(value(env, "GOOGLE_CLIENT_ID") && value(env, "GOOGLE_CLIENT_SECRET"));
  add("google_oauth_configuration", googleReady ? "pass" : "fail", "Enabled Google authentication requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");

  const runtimeDb = validDatabaseUrl(value(env, "DATABASE_URL"));
  const directDb = validDatabaseUrl(value(env, "DIRECT_URL"));
  add("database_urls", runtimeDb && directDb ? "pass" : "fail", "DATABASE_URL and DIRECT_URL must be credentialed PostgreSQL URLs requiring TLS.");
  if (runtimeDb && directDb) {
    const sameTarget = runtimeDb.pathname === directDb.pathname &&
      normalizedDatabaseHost(runtimeDb.hostname) === normalizedDatabaseHost(directDb.hostname);
    add("database_target", sameTarget ? "pass" : "fail", "Runtime and migration URLs must target the same database endpoint and database name; roles may be separated.");
    add("database_connection_separation", runtimeDb.href !== directDb.href ? "pass" : "fail", "Runtime and direct database URLs must not be identical.");
    const neon = runtimeDb.hostname.endsWith(".neon.tech") && directDb.hostname.endsWith(".neon.tech");
    const neonSeparated = !neon || (runtimeDb.hostname.includes("-pooler.") && !directDb.hostname.includes("-pooler."));
    add("neon_pooling", neonSeparated ? "pass" : "fail", "For Neon, DATABASE_URL must be pooled and DIRECT_URL must be direct.");
  }

  const smtpPort = Number(value(env, "SMTP_PORT"));
  const mailReady = Boolean(value(env, "SMTP_HOST") && value(env, "SMTP_USER") && value(env, "SMTP_PASSWORD")) &&
    Number.isInteger(smtpPort) && smtpPort >= 1 && smtpPort <= 65535 && validSender(value(env, "AUTH_EMAIL_FROM"));
  add("smtp_configuration", mailReady ? "pass" : "fail", "SMTP credentials, a valid port and a newline-free sender address are required.");

  const missingR2 = R2_KEYS.filter((key) => !value(env, key));
  add("r2_required_configuration", missingR2.length === 0 ? "pass" : "fail", "All R2 configuration keys must be present.");
  if (missingR2.length === 0) {
    const accountId = value(env, "R2_ACCOUNT_ID");
    const endpoint = validOrigin(value(env, "R2_ENDPOINT"));
    const publicBase = validOrigin(value(env, "R2_PUBLIC_BASE_URL"));
    const endpointMatches = endpoint && endpoint.hostname === `${accountId}.r2.cloudflarestorage.com`;
    add("r2_https_origins", endpointMatches && publicBase ? "pass" : "fail", "R2 endpoint and public base URL must be credential-free HTTPS origins; endpoint must match the account ID.");
    add("r2_bucket_separation", value(env, "R2_PUBLIC_BUCKET") !== value(env, "R2_PRIVATE_BUCKET") ? "pass" : "fail", "Public and private R2 buckets must be different.");
    const ttl = Number(value(env, "R2_SIGNED_URL_TTL_SECONDS"));
    add("r2_signed_url_ttl", Number.isInteger(ttl) && ttl >= 60 && ttl <= 900 ? "pass" : "fail", "R2 signed URL TTL must be between 60 and 900 seconds.");
  }

  const trustedHeader = value(env, "AUTH_TRUSTED_IP_HEADER");
  add("trusted_ip_header", trustedHeader ? "fail" : "pass", "Keep AUTH_TRUSTED_IP_HEADER empty until an overwrite-only single-IP header is proven in staging.");

  const vercelEnv = value(env, "VERCEL_ENV");
  add("vercel_environment", !vercelEnv || vercelEnv === "production" ? "pass" : "fail", "When present, VERCEL_ENV must be production for this check.");

  const manualGates = [
    "neon_restore_rehearsal",
    "neon_least_privilege_review",
    "vercel_environment_scope_review",
    "vercel_proxy_header_observation",
    "r2_private_bucket_public_access_test",
    "r2_live_signed_url_expiry_test",
    "smtp_delivery_spf_dkim_dmarc_test",
    "monitoring_and_alert_test",
    "dependency_advisory_disposition",
  ].map((id) => ({ id, status: "pending" }));

  return {
    mode: "closed-state-production-readiness",
    automatedReady: checks.every((check) => check.status !== "fail"),
    externalVerificationRequired: true,
    checks,
    manualGates,
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const report = evaluateClosedReadiness(process.env);
  console.log(JSON.stringify(report, null, 2));
  if (!report.automatedReady) process.exitCode = 1;
}

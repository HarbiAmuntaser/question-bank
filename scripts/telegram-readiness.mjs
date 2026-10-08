const env = process.env;
const results = [];

const BOT_TOKEN = /^[1-9][0-9]{4,15}:[A-Za-z0-9_-]{30,100}$/;
const BOT_USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
const RUNTIME_SECRET = /^[A-Za-z0-9_-]{32,256}$/;

function check(id, pass, message) {
  results.push({ id, status: pass ? "pass" : "fail", message });
}

function parseDelay(value) {
  if (!value?.trim()) return 15;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 15 ? parsed : null;
}

const requestedEnabled = env.TELEGRAM_ACCESS_ENABLED?.trim() === "true";
const delay = parseDelay(env.TELEGRAM_EXPIRY_MAX_DELAY_MINUTES);

check(
  "telegram_release_control",
  env.TELEGRAM_ACCESS_ENABLED === "true" || env.TELEGRAM_ACCESS_ENABLED === "false",
  "TELEGRAM_ACCESS_ENABLED must be explicitly true or false.",
);
check(
  "telegram_expiry_window",
  delay !== null,
  "TELEGRAM_EXPIRY_MAX_DELAY_MINUTES must be an integer between 1 and 15.",
);

if (requestedEnabled) {
  let authOriginValid = false;
  try {
    const url = new URL(env.NEXTAUTH_URL ?? "");
    authOriginValid = url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash;
  } catch {}
  check("telegram_bot_token", BOT_TOKEN.test(env.TELEGRAM_BOT_TOKEN?.trim() ?? ""), "TELEGRAM_BOT_TOKEN has an invalid shape.");
  check("telegram_bot_username", BOT_USERNAME.test((env.TELEGRAM_BOT_USERNAME?.trim() ?? "").replace(/^@/, "")), "TELEGRAM_BOT_USERNAME has an invalid shape.");
  check("telegram_webhook_secret", RUNTIME_SECRET.test(env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? ""), "TELEGRAM_WEBHOOK_SECRET must be a URL-safe secret of at least 32 characters.");
  check("telegram_sync_secret", RUNTIME_SECRET.test(env.TELEGRAM_SYNC_SECRET?.trim() ?? ""), "TELEGRAM_SYNC_SECRET must be a URL-safe secret of at least 32 characters.");
  check("telegram_https_origin", authOriginValid, "NEXTAUTH_URL must be a root HTTPS origin when Telegram access is enabled.");
}

const failed = results.some((item) => item.status === "fail");
console.log(JSON.stringify({
  feature: "telegram_access",
  requestedEnabled,
  effectiveState: requestedEnabled && !failed ? "ready" : requestedEnabled ? "invalid" : "closed",
  results,
  externalVerificationRequired: requestedEnabled,
}, null, 2));
if (failed) process.exitCode = 1;

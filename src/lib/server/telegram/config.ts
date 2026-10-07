import "server-only";

const BOT_TOKEN = /^[1-9][0-9]{4,15}:[A-Za-z0-9_-]{30,100}$/;
const BOT_USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
const WEBHOOK_SECRET = /^[A-Za-z0-9_-]{32,256}$/;

export const TELEGRAM_LINK_TOKEN_TTL_SECONDS = 10 * 60;
export const DEFAULT_TELEGRAM_EXPIRY_MAX_DELAY_MINUTES = 15;

type TelegramEnvironment = {
  TELEGRAM_ACCESS_ENABLED?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_EXPIRY_MAX_DELAY_MINUTES?: string;
};

export type TelegramRuntimeConfig = {
  enabled: boolean;
  requestedEnabled: boolean;
  botToken: string | null;
  botUsername: string | null;
  webhookSecret: string | null;
  expiryMaxDelayMinutes: number;
  reason: "enabled" | "disabled" | "invalid_configuration";
};

function expiryDelay(raw: string | undefined) {
  if (!raw?.trim()) return DEFAULT_TELEGRAM_EXPIRY_MAX_DELAY_MINUTES;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 15 ? value : null;
}

export function getTelegramRuntimeConfig(
  env: TelegramEnvironment = process.env as TelegramEnvironment,
): TelegramRuntimeConfig {
  const requestedEnabled = env.TELEGRAM_ACCESS_ENABLED?.trim() === "true";
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const botUsername = (env.TELEGRAM_BOT_USERNAME?.trim() ?? "").replace(/^@/, "");
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  const delay = expiryDelay(env.TELEGRAM_EXPIRY_MAX_DELAY_MINUTES);
  const valid = BOT_TOKEN.test(botToken) && BOT_USERNAME.test(botUsername) &&
    WEBHOOK_SECRET.test(webhookSecret) && delay !== null;

  if (!requestedEnabled) {
    return {
      enabled: false,
      requestedEnabled,
      botToken: null,
      botUsername: null,
      webhookSecret: null,
      expiryMaxDelayMinutes: delay ?? DEFAULT_TELEGRAM_EXPIRY_MAX_DELAY_MINUTES,
      reason: "disabled",
    };
  }
  if (!valid) {
    return {
      enabled: false,
      requestedEnabled,
      botToken: null,
      botUsername: null,
      webhookSecret: null,
      expiryMaxDelayMinutes: delay ?? DEFAULT_TELEGRAM_EXPIRY_MAX_DELAY_MINUTES,
      reason: "invalid_configuration",
    };
  }
  return {
    enabled: true,
    requestedEnabled,
    botToken,
    botUsername,
    webhookSecret,
    expiryMaxDelayMinutes: delay,
    reason: "enabled",
  };
}

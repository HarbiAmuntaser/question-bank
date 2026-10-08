import "server-only";

import { timingSafeEqual } from "node:crypto";

export function safeTelegramSecret(expected: string | null, provided: string | null) {
  if (!expected || !provided) return false;
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(provided, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function telegramBotId(botToken: string) {
  const separator = botToken.indexOf(":");
  return separator > 0 ? botToken.slice(0, separator) : null;
}

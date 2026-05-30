import { createHash, randomInt } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeSubscriptionCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function hashSubscriptionCode(code: string) {
  const normalized = normalizeSubscriptionCode(code);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function generateSubscriptionCode(prefix = "QB") {
  const chars = Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]);
  const grouped = [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)]
    .map((group) => group.join(""))
    .join("-");
  return `${prefix}-${grouped}`;
}

export function codePreviewFromPlainCode(code: string) {
  const normalized = normalizeSubscriptionCode(code);
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 3)}...${normalized.slice(-4)}`;
}

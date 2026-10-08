import "server-only";

import { ZodError } from "zod";

import { authOrigin } from "@/lib/server/auth-config";
import { AuthRateLimitError } from "@/lib/server/auth-rate-limit";
import { TelegramApiError } from "@/lib/server/telegram/api";
import { TelegramAccessError } from "@/lib/server/telegram/errors";

const MAX_BODY_BYTES = 64 * 1024;

export function telegramJson(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      ...Object.fromEntries(new Headers(extraHeaders).entries()),
    },
  });
}

export function requireTelegramOrigin(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if (contentType !== "application/json") {
    throw new TelegramAccessError("telegram_invalid_content_type", 415);
  }
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (origin !== authOrigin() || site === "cross-site" || site === "same-site") {
    throw new TelegramAccessError("telegram_forbidden", 403);
  }
}

export async function readTelegramJson(request: Request, maxBytes = MAX_BODY_BYTES) {
  if (!request.body) throw new TelegramAccessError("telegram_invalid_payload");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new TelegramAccessError("telegram_payload_too_large", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new TelegramAccessError("telegram_invalid_payload");
  }
}

export function telegramErrorResponse(error: unknown) {
  if (error instanceof TelegramAccessError) {
    return telegramJson({ error: error.code }, error.status);
  }
  if (error instanceof AuthRateLimitError) {
    return telegramJson(
      { error: "too_many_requests" },
      429,
      { "retry-after": String(error.retryAfter) },
    );
  }
  if (error instanceof ZodError) {
    return telegramJson({ error: "telegram_invalid_payload" }, 400);
  }
  if (error instanceof TelegramApiError) {
    return telegramJson({ error: "telegram_upstream_unavailable" }, 503);
  }
  return telegramJson({ error: "telegram_unavailable" }, 503);
}
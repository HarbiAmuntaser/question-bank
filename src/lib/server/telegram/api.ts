import "server-only";

import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";

const TELEGRAM_API_ORIGIN = "https://api.telegram.org";
const METHOD = /^[A-Za-z][A-Za-z0-9]{1,63}$/;

type TelegramEnvelope<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  parameters?: { retry_after?: number };
};

export class TelegramApiError extends Error {
  constructor(
    public readonly category:
      | "disabled"
      | "timeout"
      | "network"
      | "rate_limited"
      | "rejected"
      | "invalid_response",
    public readonly responseCode: number | null = null,
    public readonly retryAfter: number | null = null,
  ) {
    super("telegram_api_" + category);
  }
}

export async function callTelegramApi<T>(
  method: string,
  payload: Record<string, unknown>,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    env?: Parameters<typeof getTelegramRuntimeConfig>[0];
  } = {},
): Promise<T> {
  if (!METHOD.test(method)) throw new TelegramAccessError("telegram_method_invalid");
  const config = getTelegramRuntimeConfig(options.env);
  if (!config.enabled || !config.botToken) throw new TelegramApiError("disabled");
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  try {
    let response: Response;
    try {
      response = await fetchImpl(
        TELEGRAM_API_ORIGIN + "/bot" + config.botToken + "/" + method,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: controller.signal,
        },
      );
    } catch (error) {
      throw new TelegramApiError(
        error instanceof Error && error.name === "AbortError" ? "timeout" : "network",
      );
    }
    let body: TelegramEnvelope<T>;
    try {
      body = await response.json() as TelegramEnvelope<T>;
    } catch {
      throw new TelegramApiError("invalid_response", response.status);
    }
    if (!response.ok || !body.ok || body.result === undefined) {
      const retryAfter = Number.isInteger(body.parameters?.retry_after)
        ? body.parameters!.retry_after!
        : null;
      throw new TelegramApiError(
        response.status === 429 || retryAfter !== null ? "rate_limited" : "rejected",
        body.error_code ?? response.status,
        retryAfter,
      );
    }
    return body.result;
  } finally {
    clearTimeout(timeout);
  }
}

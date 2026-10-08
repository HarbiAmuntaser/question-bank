import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { telegramErrorResponse, telegramJson, readTelegramJson } from "@/lib/server/telegram/http";
import { safeTelegramSecret } from "@/lib/server/telegram/security";
import { handleTelegramWebhookUpdate } from "@/lib/server/telegram/webhook";
import { TelegramAccessError } from "@/lib/server/telegram/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const config = getTelegramRuntimeConfig();
    if (!config.enabled || !config.webhookSecret) {
      throw new TelegramAccessError("not_found", 404);
    }
    if (!safeTelegramSecret(
      config.webhookSecret,
      request.headers.get("x-telegram-bot-api-secret-token"),
    )) {
      throw new TelegramAccessError("unauthorized", 401);
    }
    const update = await readTelegramJson(request);
    const result = await handleTelegramWebhookUpdate(update);
    return telegramJson({ ok: true, outcome: result.outcome });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}
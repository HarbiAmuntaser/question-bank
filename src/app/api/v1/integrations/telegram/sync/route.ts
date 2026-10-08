import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { telegramErrorResponse, telegramJson } from "@/lib/server/telegram/http";
import { safeTelegramSecret } from "@/lib/server/telegram/security";
import { expireTelegramLinkTokens } from "@/lib/server/telegram/link-tokens";
import {
  processTelegramSyncJobs,
  sweepDueTelegramMemberships,
} from "@/lib/server/telegram/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const config = getTelegramRuntimeConfig();
    if (!config.enabled || !config.syncSecret) {
      throw new TelegramAccessError("not_found", 404);
    }
    const authorization = request.headers.get("authorization") ?? "";
    const provided = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    if (!safeTelegramSecret(config.syncSecret, provided)) {
      throw new TelegramAccessError("unauthorized", 401);
    }
    const expiredTokens = await expireTelegramLinkTokens(100);
    const queued = await processTelegramSyncJobs(25);
    const due = await sweepDueTelegramMemberships(50);
    return telegramJson({ data: { expiredTokens, queued, due } });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}
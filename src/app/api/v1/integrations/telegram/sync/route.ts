import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { telegramErrorResponse, telegramJson } from "@/lib/server/telegram/http";
import { safeTelegramSecret } from "@/lib/server/telegram/security";
import { runTelegramSync } from "@/lib/server/telegram/sync-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

async function handleSync(request: Request, secretType: "cron" | "manual") {
  try {
    const config = getTelegramRuntimeConfig();
    if (!config.enabled) throw new TelegramAccessError("not_found", 404);
    const expected = secretType === "cron" ? config.cronSecret : config.syncSecret;
    if (!safeTelegramSecret(expected, bearerToken(request))) {
      throw new TelegramAccessError("unauthorized", 401);
    }
    return telegramJson({ data: await runTelegramSync() });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}

export function GET(request: Request) {
  return handleSync(request, "cron");
}

export function POST(request: Request) {
  return handleSync(request, "manual");
}

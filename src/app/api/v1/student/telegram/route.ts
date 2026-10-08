import { z } from "zod";

import {
  resolveTelegramAccountAccess,
  resolveTelegramGuestAccess,
} from "@/lib/server/telegram/access";
import { telegramErrorResponse, telegramJson, readTelegramJson, requireTelegramOrigin } from "@/lib/server/telegram/http";
import { issueTelegramStudentLinkToken } from "@/lib/server/telegram/link-tokens";
import { getTelegramPrincipalStatus } from "@/lib/server/telegram/membership";
import {
  resolveTelegramRequestPrincipal,
  telegramPrincipalRateKey,
} from "@/lib/server/telegram/request-principal";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";
import { consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subjectSchema = z.string().uuid();
const linkSchema = z.object({ subjectId: subjectSchema }).strict();

async function requireSubjectAccess(
  subjectId: string,
  principal: NonNullable<Awaited<ReturnType<typeof resolveTelegramRequestPrincipal>>>,
) {
  const access = principal.type === "account"
    ? await resolveTelegramAccountAccess({ userId: principal.user.id, subjectId })
    : await resolveTelegramGuestAccess({
      codeAccessGrantId: principal.codeAccessGrantId,
      subjectId,
    });
  if (!access.allowed) throw new TelegramAccessError("telegram_access_required", 403);
}

export async function GET(request: Request) {
  try {
    if (!getTelegramRuntimeConfig().enabled) {
      throw new TelegramAccessError("not_found", 404);
    }
    const subjectId = subjectSchema.parse(new URL(request.url).searchParams.get("subjectId"));
    const principal = await resolveTelegramRequestPrincipal(request, subjectId);
    if (!principal) throw new TelegramAccessError("telegram_auth_required", 401);
    await requireSubjectAccess(subjectId, principal);
    const status = await getTelegramPrincipalStatus({ subjectId, principal });
    return telegramJson({ data: status });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!getTelegramRuntimeConfig().enabled) {
      throw new TelegramAccessError("not_found", 404);
    }
    requireTelegramOrigin(request);
    const input = linkSchema.parse(await readTelegramJson(request, 4_096));
    const principal = await resolveTelegramRequestPrincipal(request, input.subjectId);
    if (!principal) throw new TelegramAccessError("telegram_auth_required", 401);
    await consumeAuthLimit("telegram-link-ip", requestIdentity(request.headers), 30, 900);
    await consumeAuthLimit("telegram-link-principal", telegramPrincipalRateKey(principal), 6, 600);
    const issued = await issueTelegramStudentLinkToken({
      subjectId: input.subjectId,
      principal,
    });
    return telegramJson({ data: {
      startUrl: issued.startUrl,
      expiresAt: issued.expiresAt,
    } }, 201);
  } catch (error) {
    return telegramErrorResponse(error);
  }
}
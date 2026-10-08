import { z } from "zod";

import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { telegramErrorResponse, telegramJson, readTelegramJson, requireTelegramOrigin } from "@/lib/server/telegram/http";
import { issueTelegramAdminConnectToken } from "@/lib/server/telegram/link-tokens";
import { TelegramAccessError } from "@/lib/server/telegram/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subjectSchema = z.string().uuid();
const connectSchema = z.object({ subjectId: subjectSchema }).strict();

export async function GET(request: Request) {
  const auth = await verifyAdmin(request, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  try {
    const subjectId = subjectSchema.parse(new URL(request.url).searchParams.get("subjectId"));
    const channel = await prisma.telegramSubjectChannel.findUnique({
      where: { subjectId },
      select: {
        id: true,
        subjectId: true,
        title: true,
        status: true,
        isEnabled: true,
        botCanInviteUsers: true,
        botCanRestrictMembers: true,
        verifiedAt: true,
        lastHealthCheckedAt: true,
      },
    });
    return telegramJson({ data: { channel } });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  try {
    requireTelegramOrigin(request);
    const input = connectSchema.parse(await readTelegramJson(request, 4_096));
    await consumeAuthLimit("telegram-admin-connect-ip", requestIdentity(request.headers), 20, 900);
    await consumeAuthLimit("telegram-admin-connect-actor", auth.userId, 5, 600);
    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true, isActive: true, sessionVersion: true },
    });
    if (!admin?.isActive || admin.role !== "admin") {
      throw new TelegramAccessError("telegram_admin_forbidden", 403);
    }
    const issued = await issueTelegramAdminConnectToken({
      subjectId: input.subjectId,
      admin: { id: admin.id, sessionVersion: admin.sessionVersion },
    });
    return telegramJson({ data: {
      startUrl: issued.startUrl,
      expiresAt: issued.expiresAt,
    } }, 201);
  } catch (error) {
    return telegramErrorResponse(error);
  }
}
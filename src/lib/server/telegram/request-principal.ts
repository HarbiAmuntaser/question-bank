import "server-only";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { guestAccessTokenFromRequest } from "@/lib/server/code-access-cookie";
import { hashGuestAccessToken } from "@/lib/server/subscription-code";

export type TelegramRequestPrincipal =
  | { type: "account"; user: { id: string; sessionVersion: number } }
  | { type: "guest_grant"; codeAccessGrantId: string };

export async function resolveTelegramRequestPrincipal(
  request: Request,
  subjectId: string,
): Promise<TelegramRequestPrincipal | null> {
  const user = await getCurrentUser();
  if (user) {
    return user.role === "student" && Boolean(user.emailVerified)
      ? { type: "account", user: { id: user.id, sessionVersion: user.sessionVersion } }
      : null;
  }

  const guestToken = guestAccessTokenFromRequest(request);
  if (!guestToken) return null;
  const now = new Date();
  const binding = await prisma.codeAccessSessionBinding.findFirst({
    where: {
      revokedAt: null,
      session: {
        tokenHash: hashGuestAccessToken(guestToken),
        revokedAt: null,
        expiresAt: { gt: now },
      },
      grant: {
        subjectId,
        principalType: "guest",
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gt: now },
      },
    },
    orderBy: [{ lastUsedAt: "desc" }, { id: "asc" }],
    select: { grantId: true },
  });
  return binding ? { type: "guest_grant", codeAccessGrantId: binding.grantId } : null;
}

export function telegramPrincipalRateKey(principal: TelegramRequestPrincipal) {
  return principal.type === "account"
    ? "account:" + principal.user.id
    : "guest-grant:" + principal.codeAccessGrantId;
}

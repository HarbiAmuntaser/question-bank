import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {
  hashGuestAccessToken,
  hashSubscriptionCode,
  isGuestAccessToken,
} from "@/lib/server/subscription-code";

export const CODE_ACCESS_COOKIE = "mw_code_access";

function cookieValue(header: string | null, name: string) {
  if (!header) return null;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    const value = item.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function guestAccessTokenFromRequest(request: Request) {
  const value = cookieValue(request.headers.get("cookie"), CODE_ACCESS_COOKIE);
  return value && isGuestAccessToken(value) ? value : null;
}

export async function activeGuestAccessTokenFromRequest(request: Request) {
  const token = guestAccessTokenFromRequest(request);
  if (!token) return null;
  const session = await prisma.guestAccessSession.findUnique({
    where: { tokenHash: hashGuestAccessToken(token) },
    select: { expiresAt: true, revokedAt: true },
  });
  return session && !session.revokedAt && session.expiresAt > new Date() ? token : null;
}

export async function guestAccessTokenFromServerCookies() {
  const value = (await cookies()).get(CODE_ACCESS_COOKIE)?.value?.trim() ?? null;
  return value && isGuestAccessToken(value) ? value : null;
}

export function deriveGuestAccessToken(input: {
  idempotencyKey: string;
  code: string;
  subjectId: string;
}) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("auth_secret_required");
  return createHmac("sha256", secret)
    .update("mustawak-code-access-v1\0")
    .update(input.idempotencyKey)
    .update("\0")
    .update(hashSubscriptionCode(input.code))
    .update("\0")
    .update(input.subjectId)
    .digest("base64url");
}

export function guestAccessCookieHeader(token: string, expiresAt: Date) {
  if (!isGuestAccessToken(token) || !Number.isFinite(expiresAt.getTime())) {
    throw new Error("invalid_guest_session_cookie");
  }
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const attributes = [
    CODE_ACCESS_COOKIE + "=" + encodeURIComponent(token),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=" + expiresAt.toUTCString(),
    "Max-Age=" + maxAge,
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  return attributes.join("; ");
}

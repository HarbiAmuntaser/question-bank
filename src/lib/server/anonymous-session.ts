import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";

import { prisma } from "@/lib/prisma";

export const ANON_SESSION_COOKIE = "qb_anon_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(ANON_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: expiresAt,
  });
}

export async function getExistingAnonymousSession() {
  const jar = await cookies();
  const token = jar.get(ANON_SESSION_COOKIE)?.value?.trim();
  if (!token) return null;

  const session = await prisma.anonymousSession.findUnique({
    where: { sessionToken: token },
  });

  if (!session || session.expiresAt <= new Date()) return null;

  return session;
}

export async function getOrCreateAnonymousSession() {
  const jar = await cookies();
  const token = jar.get(ANON_SESSION_COOKIE)?.value?.trim();
  const now = new Date();

  if (token) {
    const existing = await prisma.anonymousSession.findUnique({
      where: { sessionToken: token },
    });

    if (existing && existing.expiresAt > now) {
      const session = await prisma.anonymousSession.update({
        where: { id: existing.id },
        data: { lastActivity: now },
      });
      return { session, token, created: false };
    }
  }

  const h = await headers();
  const nextToken = newSessionToken();
  const expiresAt = sessionExpiry();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = h.get("user-agent") || null;

  const session = await prisma.anonymousSession.create({
    data: {
      sessionToken: nextToken,
      ipAddress: forwardedFor,
      userAgent,
      expiresAt,
      lastActivity: now,
    },
  });

  await setSessionCookie(nextToken, expiresAt);

  return { session, token: nextToken, created: true };
}

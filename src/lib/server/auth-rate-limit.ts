import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

export class AuthRateLimitError extends Error {
  constructor(public readonly retryAfter: number) { super("too_many_requests"); }
}

export function requestIdentity(headers: Headers): string {
  // Only trust an explicitly configured header overwritten by the deployment proxy.
  const header = process.env.AUTH_TRUSTED_IP_HEADER;
  const value = header ? headers.get(header)?.trim() : undefined;
  return value && isIP(value) ? value : "shared";
}

export async function consumeAuthLimit(bucket: string, identity: string, limit: number, seconds: number) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("auth_secret_required");
  const key = createHmac("sha256", secret).update(bucket + ":" + identity).digest("hex");
  // One atomic database operation shared by every application instance, using DB time.
  const rows = await prisma.$queryRaw<{ attempts: number; retryAfter: number }[]>`
    INSERT INTO "auth_rate_limits" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, clock_timestamp() + ${seconds} * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "auth_rate_limits"."expiresAt" <= clock_timestamp() THEN 1
        ELSE LEAST("auth_rate_limits"."attempts" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "auth_rate_limits"."expiresAt" <= clock_timestamp()
        THEN clock_timestamp() + ${seconds} * interval '1 second' ELSE "auth_rate_limits"."expiresAt" END
    RETURNING "attempts", GREATEST(1, ceil(extract(epoch FROM ("expiresAt" - clock_timestamp()))))::int AS "retryAfter"
  `;
  if (!rows[0]) throw new Error("auth_limiter_unavailable");
  if (rows[0].attempts > limit) throw new AuthRateLimitError(rows[0].retryAfter);
}

export async function limitLogin(headers: Headers, email: string) {
  await consumeAuthLimit("login-ip", requestIdentity(headers), 60, 900);
  await consumeAuthLimit("login-email", email, 10, 900);
}

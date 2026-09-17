import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  // Bounded batches; schedule hourly. No users or active tokens are removed.
  const limits = await prisma.$executeRaw`DELETE FROM "auth_rate_limits" WHERE "expiresAt" < now() - interval '1 day' AND "key" IN (SELECT "key" FROM "auth_rate_limits" WHERE "expiresAt" < now() - interval '1 day' LIMIT 10000)`;
  const tokens = await prisma.$executeRaw`DELETE FROM "user_auth_tokens" WHERE "id" IN (SELECT "id" FROM "user_auth_tokens" WHERE "expiresAt" < now() LIMIT 10000)`;
  console.log(JSON.stringify({ expiredLimitsRemoved: limits, expiredTokensRemoved: tokens }));
} finally { await prisma.$disconnect(); }

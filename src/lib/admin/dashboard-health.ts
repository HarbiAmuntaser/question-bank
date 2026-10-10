import "server-only"

import { prisma } from "@/lib/prisma"
import { verifyAuthMailConnection } from "@/lib/server/auth-mail"
import { verifyR2StorageConnection } from "@/lib/server/storage/r2"
import type { DashboardExternalCheck } from "@/types/dashboard"

async function runCheck(
  service: DashboardExternalCheck["service"],
  check: () => Promise<unknown>,
): Promise<DashboardExternalCheck> {
  const startedAt = performance.now()
  try {
    await check()
    return {
      service,
      status: "healthy",
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    }
  } catch {
    return { service, status: "unavailable", latencyMs: null }
  }
}

export async function runDashboardExternalHealthChecks(): Promise<DashboardExternalCheck[]> {
  return Promise.all([
    runCheck("database", () => prisma.$queryRaw`SELECT 1`),
    runCheck("smtp", verifyAuthMailConnection),
    runCheck("r2", verifyR2StorageConnection),
  ])
}

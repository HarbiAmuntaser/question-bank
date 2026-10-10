import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth"
import { runDashboardExternalHealthChecks } from "@/lib/admin/dashboard-health"
import { CACHE_CONTROL } from "@/lib/cache-tags"
import { bad, json } from "@/lib/server/admin-http"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "dashboard:read")
  if (!auth.ok) return adminAuthResponse(auth)

  try {
    const checks = await runDashboardExternalHealthChecks()
    return json(
      { data: { checks, checkedAt: new Date().toISOString() } },
      { headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } },
    )
  } catch {
    return bad("dashboard_health_check_failed")
  }
}

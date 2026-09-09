import { bad, json } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth"
import { getDashboardData } from "@/lib/admin/dashboard"
import { CACHE_CONTROL } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "dashboard:read")
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    const data = await getDashboardData()
    return json(
      { data },
      {
        status: 200,
        headers: {
          "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
        },
      }
    )
  } catch (error) {
    console.error("dashboard_fetch_failed", error)
    return bad("dashboard_fetch_failed")
  }
}

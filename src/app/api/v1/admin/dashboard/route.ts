import { bad, json, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { getDashboardDataCached } from "@/lib/admin/dashboard"
import { CACHE_CONTROL } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  try {
    const data = await getDashboardDataCached()
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

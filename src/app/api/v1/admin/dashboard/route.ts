import { bad, json, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { getDashboardDataCached } from "@/lib/admin/dashboard"

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
          "cache-control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    console.error("dashboard_fetch_failed", error)
    return bad("dashboard_fetch_failed")
  }
}
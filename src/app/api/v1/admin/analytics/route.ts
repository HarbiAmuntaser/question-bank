import { json, bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { getAnalyticsDataCached, parseAnalyticsDays } from "@/lib/admin/analytics"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  const url = new URL(req.url)
  const days = parseAnalyticsDays(url.searchParams.get("days"))

  try {
    const data = await getAnalyticsDataCached(days)
    return json({ data })
  } catch (error) {
    console.error("analytics_fetch_failed", error)
    return bad("analytics_fetch_failed")
  }
}
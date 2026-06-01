import { json, bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { getAnalyticsData, parseAnalyticsDays } from "@/lib/admin/analytics"
import { CACHE_CONTROL } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"

function withPrivateNoStore(response: Response) {
  response.headers.set("cache-control", CACHE_CONTROL.PRIVATE_NO_STORE)
  return response
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return withPrivateNoStore(unauth())

  const url = new URL(req.url)
  const days = parseAnalyticsDays(url.searchParams.get("days"))

  try {
    const data = await getAnalyticsData(days)
    return json({ data }, {
      headers: {
        "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
      },
    })
  } catch (error) {
    console.error("analytics_fetch_failed", error)
    return withPrivateNoStore(bad("analytics_fetch_failed"))
  }
}

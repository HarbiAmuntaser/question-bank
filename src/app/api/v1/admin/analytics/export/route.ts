import { bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import {
  buildAnalyticsCsv,
  buildAnalyticsExcelTsv,
  parseAnalyticsDays,
} from "@/lib/admin/analytics"
import { CACHE_CONTROL } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"

function withPrivateNoStore(response: Response) {
  response.headers.set("cache-control", CACHE_CONTROL.PRIVATE_NO_STORE)
  return response
}

function buildFilename(extension: "csv" | "xls"): string {
  const date = new Date().toISOString().slice(0, 10)
  return `analytics-report-${date}.${extension}`
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return withPrivateNoStore(unauth())

  const url = new URL(req.url)
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase()
  const days = parseAnalyticsDays(url.searchParams.get("days"))

  try {
    if (format === "csv") {
      const content = await buildAnalyticsCsv(days)
      return new Response(content, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${buildFilename("csv")}"`,
          "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
        },
      })
    }

    if (format === "excel") {
      const content = await buildAnalyticsExcelTsv(days)
      return new Response(content, {
        status: 200,
        headers: {
          "content-type": "application/vnd.ms-excel; charset=utf-8",
          "content-disposition": `attachment; filename="${buildFilename("xls")}"`,
          "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
        },
      })
    }

    return withPrivateNoStore(bad("unsupported_export_format"))
  } catch (error) {
    console.error("analytics_export_failed", error)
    return withPrivateNoStore(bad("analytics_export_failed"))
  }
}

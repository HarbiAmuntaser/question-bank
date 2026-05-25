import { Suspense } from "react"
import { headers as nextHeaders } from "next/headers"
import { getRequestOrigin } from "@/lib/server/request-origin"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { AnalyticsData } from "@/types/analytics"
import { parseAnalyticsDays } from "@/lib/admin/analytics"

interface ApiResponse<T> {
  data: T
}

async function getApiBase(): Promise<string> {
  return getRequestOrigin()
}

async function buildHeaders(): Promise<Headers> {
  const incoming = await nextHeaders()
  const headers = new Headers()
  headers.set("accept", "application/json")

  const adminKey = process.env.ADMIN_API_KEY
  if (adminKey) headers.set("x-admin-key", adminKey)

  const cookie = incoming.get("cookie")
  if (cookie) headers.set("cookie", cookie)

  return headers
}

async function getAnalyticsData(days: number): Promise<AnalyticsData> {
  const base = await getApiBase()
  const res = await fetch(`${base}/api/v1/admin/analytics?days=${days}`, {
    headers: await buildHeaders(),
    next: { revalidate: 300, tags: ["analytics"] },
  })

  if (!res.ok) {
    throw new Error("فشل تحميل بيانات التحليلات")
  }

  const payload = (await res.json()) as ApiResponse<AnalyticsData>
  return payload.data
}

async function AnalyticsContent({ days }: { days: number }) {
  const analyticsData = await getAnalyticsData(days)
  return <AnalyticsDashboard data={analyticsData} initialDays={days} />
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const days = parseAnalyticsDays(resolvedSearchParams.days)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">التحليلات والتقارير</h1>
        <p className="text-muted-foreground">تحليل شامل لأداء النظام والطلاب والاختبارات</p>
      </div>

      <Suspense key={days} fallback={<LoadingSpinner />}>
        <AnalyticsContent days={days} />
      </Suspense>
    </div>
  )
}

import { requireAdminPage } from "@/lib/server/admin-page-auth";
import { adminApiFetch } from "@/lib/server/admin-api-fetch";
import { Suspense } from "react"


import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { parseAnalyticsDays } from "@/lib/admin/analytics"

import type { AnalyticsData } from "@/types/analytics"

interface ApiResponse<T> {
  data: T
}

async function getAnalyticsData(days: number): Promise<AnalyticsData> {
  const res = await adminApiFetch(`/api/v1/admin/analytics?days=${days}`, {
    cache: "no-store",
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
  await requireAdminPage("analytics:read");

  const resolvedSearchParams = await searchParams
  const days = parseAnalyticsDays(resolvedSearchParams.days)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">التحليلات والتقارير</h1>
        <p className="text-muted-foreground">تحليلات تعليمية لمحاولات الاختبارات وإجابات الطلاب وأداء المواد.</p>
      </div>

      <Suspense key={days} fallback={<LoadingSpinner />}>
        <AnalyticsContent days={days} />
      </Suspense>
    </div>
  )
}

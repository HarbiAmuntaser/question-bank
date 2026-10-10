import { requireAdminPage } from "@/lib/server/admin-page-auth";
import { Suspense } from "react"


import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getAnalyticsData, parseAnalyticsDays } from "@/lib/admin/analytics"

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
        <h1 className="text-3xl font-bold tracking-tight">التحليلات</h1>
        <p className="text-muted-foreground">مؤشرات تعليمية وإحصاءات المدونة ضمن فترة زمنية محددة.</p>
      </div>

      <Suspense key={days} fallback={<LoadingSpinner />}>
        <AnalyticsContent days={days} />
      </Suspense>
    </div>
  )
}

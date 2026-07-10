"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/types/analytics"

interface PerformanceChartsProps {
  timeSeriesData: AnalyticsData["timeSeriesData"]
}

interface ChartTooltipPayloadItem {
  color?: string
  name?: string
  value?: number
  dataKey?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" })
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-sm font-medium">{formatDate(label)}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.dataKey ?? entry.name ?? "item"}-${index}`} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toLocaleString("ar-SA")}
          {entry.dataKey === "averageScore" ? "%" : ""}
        </p>
      ))}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export function PerformanceCharts({ timeSeriesData }: PerformanceChartsProps) {
  const hasAttempts = timeSeriesData.some((item) => item.attempts > 0 || item.averageScore > 0)
  const hasStudentSessions = timeSeriesData.some((item) => item.newStudentSessions > 0)

  return (
    <div className="space-y-6">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">اتجاهات الأداء</CardTitle>
          <p className="text-xs text-muted-foreground">متوسط الدرجة وعدد المحاولات حسب الفترة المحددة.</p>
        </CardHeader>
        <CardContent>
          {!hasAttempts ? (
            <EmptyChart label="لا توجد محاولات اختبارات محفوظة ضمن الفترة المحددة." />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="متوسط الدرجات"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attempts"
                    stroke="hsl(var(--brand-emerald))"
                    strokeWidth={2}
                    name="محاولات الاختبارات"
                    dot={{ fill: "hsl(var(--brand-emerald))", strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">جلسات الطلاب الجديدة</CardTitle>
          <p className="text-xs text-muted-foreground">عدد جلسات AnonymousSession الجديدة حسب الفترة.</p>
        </CardHeader>
        <CardContent>
          {!hasStudentSessions ? (
            <EmptyChart label="لا توجد جلسات طلاب جديدة ضمن الفترة المحددة." />
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="newStudentSessions" fill="hsl(var(--brand-amber))" name="جلسات طلاب جديدة" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

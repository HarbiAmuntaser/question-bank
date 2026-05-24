"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
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
    <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-800">
      <p className="text-sm font-medium">{formatDate(label)}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.dataKey ?? entry.name ?? "item"}-${index}`} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
          {entry.dataKey === "averageScore" ? "%" : ""}
        </p>
      ))}
    </div>
  )
}

export function PerformanceCharts({ timeSeriesData }: PerformanceChartsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>اتجاهات الأداء</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="averageScore"
                stroke="#8884d8"
                strokeWidth={2}
                name="متوسط الدرجات"
                dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="attempts"
                stroke="#82ca9d"
                strokeWidth={2}
                name="عدد المحاولات"
                dot={{ fill: "#82ca9d", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المستخدمون الجدد</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="newUsers" fill="#ffc658" name="مستخدمون جدد" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
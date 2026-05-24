"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { BookOpen, Users, Target } from "lucide-react"
import type { AnalyticsData } from "@/types/analytics"

interface SubjectPerformanceChartProps {
  data: AnalyticsData["subjectPerformance"]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

interface ChartTooltipPayloadItem {
  color?: string
  name?: string
  value?: number
}

interface BarTooltipProps {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
}

interface PieTooltipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number }>
}

function SubjectBarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-800">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm" style={{ color: payload[0]?.color }}>
        متوسط الدرجات: {Number(payload[0]?.value ?? 0).toFixed(1)}%
      </p>
    </div>
  )
}

function SubjectPieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-800">
      <p className="text-sm font-medium">{payload[0]?.name}</p>
      <p className="text-sm">المحاولات: {payload[0]?.value ?? 0}</p>
    </div>
  )
}

export function SubjectPerformanceChart({ data }: SubjectPerformanceChartProps) {
  const pieData = data.map((subject, index) => ({
    name: subject.subjectName,
    value: subject.totalAttempts,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>متوسط الدرجات حسب المادة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subjectName" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<SubjectBarTooltip />} />
                <Bar dataKey="averageScore" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المحاولات حسب المادة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SubjectPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل أداء المواد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.map((subject) => (
              <div key={subject.subjectId} className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{subject.subjectName}</h3>
                  <Badge
                    className={
                      subject.averageScore >= 80
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : subject.averageScore >= 60
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                    }
                  >
                    {subject.averageScore.toFixed(1)}%
                  </Badge>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
                      <p className="font-semibold">{subject.averageScore.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي المحاولات</p>
                      <p className="font-semibold">{subject.totalAttempts.toLocaleString("ar-SA")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                      <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">عدد الأسئلة</p>
                      <p className="font-semibold">{subject.questionCount.toLocaleString("ar-SA")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>الأداء العام</span>
                    <span>{subject.averageScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={subject.averageScore} className="h-2" />
                </div>
              </div>
            ))}

            {data.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">لا توجد بيانات مواد لعرضها</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
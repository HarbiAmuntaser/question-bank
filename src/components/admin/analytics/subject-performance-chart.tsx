"use client"

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BookOpen, Target, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { AnalyticsData } from "@/types/analytics"

interface SubjectPerformanceChartProps {
  data: AnalyticsData["subjectPerformance"]
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

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
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
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
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-sm font-medium">{payload[0]?.name}</p>
      <p className="text-sm">المحاولات: {(payload[0]?.value ?? 0).toLocaleString("ar-SA")}</p>
    </div>
  )
}

function scoreBadge(score: number) {
  if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
  if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
}

export function SubjectPerformanceChart({ data }: SubjectPerformanceChartProps) {
  const pieData = data.map((subject, index) => ({
    name: subject.subjectName,
    value: subject.totalAttempts,
    color: COLORS[index % COLORS.length],
  }))

  if (data.length === 0) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">أداء المواد</CardTitle>
          <p className="text-xs text-muted-foreground">المصدر: QuizAttempt مع ربط الاختبارات بالمواد.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد بيانات محاولات مرتبطة بالمواد ضمن الفترة أو الفلتر المحدد.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">متوسط الدرجات حسب المادة</CardTitle>
            <p className="text-xs text-muted-foreground">محسوب من متوسط درجات QuizAttempt لكل مادة.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subjectName" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<SubjectBarTooltip />} />
                  <Bar dataKey="averageScore" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">توزيع المحاولات حسب المادة</CardTitle>
            <p className="text-xs text-muted-foreground">يوضح المواد الأكثر استخدامًا من QuizAttempt.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} fill="#2563eb" dataKey="value" nameKey="name">
                    {pieData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<SubjectPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">تفاصيل أداء المواد</CardTitle>
          <p className="text-xs text-muted-foreground">متوسط الدرجة، عدد المحاولات، وعدد الأسئلة لكل مادة.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((subject) => (
              <div key={subject.subjectId} className="rounded-lg border p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-base font-semibold">{subject.subjectName}</h3>
                  <Badge className={scoreBadge(subject.averageScore)}>{subject.averageScore.toFixed(1)}%</Badge>
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
                      <p className="text-sm text-muted-foreground">محاولات الاختبارات</p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

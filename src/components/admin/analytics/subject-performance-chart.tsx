"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Target, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { AnalyticsData } from "@/types/analytics"

export function SubjectPerformanceChart({ data }: { data: AnalyticsData["subjectPerformance"] }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">أداء المواد</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد محاولات مرتبطة بمواد ضمن الفترة أو الفلتر المحدد.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">متوسط الدرجات حسب المادة</CardTitle>
          <p className="text-xs text-muted-foreground">محسوب من محاولات الاختبارات ضمن الفترة المختارة.</p>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subjectName" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="averageScore" name="متوسط الدرجة" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.map((subject) => (
          <Card key={subject.subjectId}>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="min-w-0 truncate font-semibold" title={subject.subjectName}>{subject.subjectName}</h3>
                <Badge variant="secondary">{subject.averageScore.toFixed(1)}%</Badge>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />متوسط الدرجة</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{subject.totalAttempts.toLocaleString("ar-SA")} محاولة</div>
              </div>
              <Progress value={subject.averageScore} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

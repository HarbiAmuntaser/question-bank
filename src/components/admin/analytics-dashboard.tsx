"use client"

import { useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BarChart3, Calendar, FileText, Filter, RefreshCw, TrendingUp } from "lucide-react"

import { BlogAnalytics } from "@/components/admin/analytics/blog-analytics"
import { LearningInsights } from "@/components/admin/analytics/learning-insights"
import { OverviewCards } from "@/components/admin/analytics/overview-cards"
import { QuizAnalyticsTable } from "@/components/admin/analytics/quiz-analytics-table"
import { SubjectPerformanceChart } from "@/components/admin/analytics/subject-performance-chart"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AnalyticsData } from "@/types/analytics"

interface AnalyticsDashboardProps {
  data: AnalyticsData
  initialDays: number
}

function buildRangeOptions(initialDays: number) {
  const options = [
    { value: "1", label: "اليوم" },
    { value: "7", label: "آخر 7 أيام" },
    { value: "30", label: "آخر 30 يومًا" },
  ]
  if (!options.some((item) => item.value === String(initialDays))) {
    options.push({ value: String(initialDays), label: `آخر ${initialDays.toLocaleString("ar-SA")} يوم` })
  }
  return options
}

export function AnalyticsDashboard({ data, initialDays }: AnalyticsDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [isPending, startTransition] = useTransition()
  const rangeOptions = useMemo(() => buildRangeOptions(initialDays), [initialDays])
  const filteredSubjects = useMemo(
    () => selectedSubject === "all"
      ? data.subjectPerformance
      : data.subjectPerformance.filter((subject) => subject.subjectId === selectedSubject),
    [data.subjectPerformance, selectedSubject],
  )

  const updateDays = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("days", value)
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">التحليلات التعليمية والمحتوى</h2>
          <p className="mt-1 text-sm text-muted-foreground">مؤشرات محدودة ومجمعة للفترة المختارة دون تحميل سجلات تفصيلية غير ضرورية.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select value={String(initialDays)} onValueChange={updateDays}>
            <SelectTrigger className="h-10 w-full sm:w-[170px]">
              <Calendar className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            disabled={isPending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw className={isPending ? "animate-spin" : undefined} />
            تحديث
          </Button>
        </div>
      </div>

      <OverviewCards data={data.overview} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />نظرة عامة</TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-2"><FileText className="h-4 w-4" />الاختبارات</TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2"><TrendingUp className="h-4 w-4" />المواد</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <LearningInsights quizzes={data.quizPerformance} />
          <BlogAnalytics data={data.blog} initialDays={initialDays} />
        </TabsContent>

        <TabsContent value="quizzes">
          <QuizAnalyticsTable data={data.quizPerformance} />
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <div className="flex justify-end">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-10 w-full sm:w-[240px]">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="جميع المواد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المواد</SelectItem>
                {data.subjectPerformance.map((subject) => (
                  <SelectItem key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SubjectPerformanceChart data={filteredSubjects} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

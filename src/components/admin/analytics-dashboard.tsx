"use client"

import { useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BarChart3, Calendar, Download, FileText, Filter, RefreshCw, TrendingUp, Users } from "lucide-react"

import { LearningInsights } from "@/components/admin/analytics/learning-insights"
import { ExportReports } from "@/components/admin/analytics/export-reports"
import { OverviewCards } from "@/components/admin/analytics/overview-cards"
import { PerformanceCharts } from "@/components/admin/analytics/performance-charts"
import { QuestionAnalysisTable } from "@/components/admin/analytics/question-analysis-table"
import { QuizAnalyticsTable } from "@/components/admin/analytics/quiz-analytics-table"
import { SubjectPerformanceChart } from "@/components/admin/analytics/subject-performance-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AnalyticsData } from "@/types/analytics"

interface AnalyticsDashboardProps {
  data: AnalyticsData
  initialDays: number
}

function buildRangeOptions(initialDays: number) {
  const monthDays = new Date().getDate()
  const options = [
    { value: "1", label: "اليوم" },
    { value: "7", label: "آخر 7 أيام" },
    { value: "30", label: "آخر 30 يوم" },
  ]

  const monthOption = options.find((option) => option.value === String(monthDays))
  if (monthOption) {
    monthOption.label = `${monthOption.label} / هذا الشهر`
  } else {
    options.push({ value: String(monthDays), label: "هذا الشهر" })
  }

  if (!options.some((item) => item.value === String(initialDays))) {
    options.push({ value: String(initialDays), label: `آخر ${initialDays.toLocaleString("ar-SA")} يوم` })
  }

  return options
}

function DifficultyBreakdownCard({ data }: { data: AnalyticsData["difficultyBreakdown"] }) {
  const rows = [
    { label: "سهل", color: "bg-green-500", value: data.easy },
    { label: "متوسط", color: "bg-yellow-500", value: data.medium },
    { label: "صعب", color: "bg-red-500", value: data.hard },
  ]

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">توزيع مستوى الصعوبة</CardTitle>
        <p className="text-xs text-muted-foreground">عدد الأسئلة ومتوسط الإجابة الصحيحة من UserAnswer.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${row.color}`} />
                <span className="text-sm">{row.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{row.value.count.toLocaleString("ar-SA")} سؤال</div>
                <div className="text-xs text-muted-foreground">صحيح: {row.value.averageScore.toFixed(1)}%</div>
              </div>
            </div>
            <Progress value={row.value.averageScore} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard({ data, initialDays }: AnalyticsDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [isPending, startTransition] = useTransition()

  const rangeOptions = useMemo(() => buildRangeOptions(initialDays), [initialDays])
  const rangeValue = useMemo(() => String(initialDays), [initialDays])

  const filteredSubjectPerformance = useMemo(() => {
    if (selectedSubject === "all") return data.subjectPerformance
    return data.subjectPerformance.filter((subject) => subject.subjectId === selectedSubject)
  }, [data.subjectPerformance, selectedSubject])

  const updateDays = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("days", value)

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">تحليلات تعليمية</h2>
          <p className="text-sm text-muted-foreground">
            تعرض هذه الصفحة محاولات الاختبارات، إجابات الطلاب، وأداء المواد فقط.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Select value={rangeValue} onValueChange={updateDays}>
            <SelectTrigger className="h-10 w-full sm:w-[170px]">
              <Calendar className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-10 w-full sm:w-[190px]">
              <Filter className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المواد</SelectItem>
              {data.subjectPerformance.map((subject) => (
                <SelectItem key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex h-10 w-full items-center gap-2 bg-transparent sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      <OverviewCards data={data.overview} />

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-grid min-w-max grid-cols-5 sm:w-full">
            <TabsTrigger value="overview" className="flex h-10 items-center gap-2 whitespace-nowrap px-3">
              <BarChart3 className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex h-10 items-center gap-2 whitespace-nowrap px-3">
              <FileText className="h-4 w-4" />
              الاختبارات
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex h-10 items-center gap-2 whitespace-nowrap px-3">
              <Users className="h-4 w-4" />
              الأسئلة
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex h-10 items-center gap-2 whitespace-nowrap px-3">
              <TrendingUp className="h-4 w-4" />
              المواد
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex h-10 items-center gap-2 whitespace-nowrap px-3">
              <Download className="h-4 w-4" />
              التقارير
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <LearningInsights quizzes={data.quizPerformance} questions={data.questionAnalysis} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <PerformanceCharts timeSeriesData={data.timeSeriesData} />
            <DifficultyBreakdownCard data={data.difficultyBreakdown} />
          </div>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-6">
          <QuizAnalyticsTable data={data.quizPerformance} />
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <QuestionAnalysisTable data={data.questionAnalysis} />
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <SubjectPerformanceChart data={filteredSubjectPerformance} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>تصدير التقارير</CardTitle>
              <p className="text-sm text-muted-foreground">
                تصدير بيانات التحليلات التعليمية الحالية بصيغ CSV و Excel.
              </p>
            </CardHeader>
            <CardContent>
              <ExportReports days={initialDays} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

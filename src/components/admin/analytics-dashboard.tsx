"use client"

import { useMemo, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OverviewCards } from "./analytics/overview-cards"
import { PerformanceCharts } from "./analytics/performance-charts"
import { QuizAnalyticsTable } from "./analytics/quiz-analytics-table"
import { QuestionAnalysisTable } from "./analytics/question-analysis-table"
import { SubjectPerformanceChart } from "./analytics/subject-performance-chart"
import { ExportReports } from "./analytics/export-reports"
import type { AnalyticsData } from "@/types/analytics"
import { BarChart3, TrendingUp, Users, FileText, Download, Calendar, Filter, RefreshCw } from "lucide-react"
import { useState } from "react"

interface AnalyticsDashboardProps {
  data: AnalyticsData
  initialDays: number
}

const RANGE_OPTIONS = [
  { value: "1", label: "اليوم" },
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 3 أشهر" },
  { value: "365", label: "السنة الماضية" },
]

export function AnalyticsDashboard({ data, initialDays }: AnalyticsDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [isPending, startTransition] = useTransition()

  const rangeValue = useMemo(() => {
    const current = String(initialDays)
    return RANGE_OPTIONS.some((item) => item.value === current) ? current : "30"
  }, [initialDays])

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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <Select value={rangeValue} onValueChange={updateDays}>
            <SelectTrigger className="w-[170px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[170px]">
              <Filter className="mr-2 h-4 w-4" />
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
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      <OverviewCards data={data.overview} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            الاختبارات
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            الأسئلة
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            المواد
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PerformanceCharts timeSeriesData={data.timeSeriesData} />
            <Card>
              <CardHeader>
                <CardTitle>توزيع مستوى الصعوبة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">سهل</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{data.difficultyBreakdown.easy.count} سؤال</div>
                      <div className="text-xs text-muted-foreground">
                        متوسط: {data.difficultyBreakdown.easy.averageScore.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={data.difficultyBreakdown.easy.averageScore} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">متوسط</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{data.difficultyBreakdown.medium.count} سؤال</div>
                      <div className="text-xs text-muted-foreground">
                        متوسط: {data.difficultyBreakdown.medium.averageScore.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={data.difficultyBreakdown.medium.averageScore} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm">صعب</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{data.difficultyBreakdown.hard.count} سؤال</div>
                      <div className="text-xs text-muted-foreground">
                        متوسط: {data.difficultyBreakdown.hard.averageScore.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={data.difficultyBreakdown.hard.averageScore} className="h-2" />
                </div>
              </CardContent>
            </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>تصدير التقارير</CardTitle>
              <p className="text-sm text-muted-foreground">تصدير فعلي بصيغ CSV و Excel من بيانات التحليلات الحالية</p>
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
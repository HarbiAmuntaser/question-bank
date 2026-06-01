"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle, Clock, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AnalyticsData } from "@/types/analytics"

interface QuestionAnalysisTableProps {
  data: AnalyticsData["questionAnalysis"]
}

function difficultyBadge(difficulty: AnalyticsData["questionAnalysis"][number]["difficulty"]) {
  switch (difficulty) {
    case "easy":
      return { label: "سهل", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" }
    case "medium":
      return { label: "متوسط", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" }
    case "hard":
      return { label: "صعب", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
  }
}

function statusBadge(question: AnalyticsData["questionAnalysis"][number]) {
  if (question.incorrectRate >= 70) {
    return { label: "صعب جدًا", variant: "destructive" as const }
  }
  if (question.incorrectRate >= 40) {
    return { label: "يحتاج مراجعة", variant: "secondary" as const }
  }
  return { label: "مستقر", variant: "outline" as const }
}

export function QuestionAnalysisTable({ data }: QuestionAnalysisTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")

  const filteredData = useMemo(() => {
    return data.filter((question) => {
      const normalizedSearch = searchTerm.trim().toLowerCase()

      const matchesSearch =
        normalizedSearch.length === 0 ||
        question.questionText.toLowerCase().includes(normalizedSearch) ||
        question.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))

      const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter
      return matchesSearch && matchesDifficulty
    })
  }, [data, searchTerm, difficultyFilter])

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-base">أصعب الأسئلة وأداء الإجابات</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">المصدر: UserAnswer، والترتيب الافتراضي حسب نسبة الخطأ.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث في الأسئلة..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 pr-10"
              />
            </div>

            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="تصفية حسب مستوى الصعوبة"
            >
              <option value="all">كل المستويات</option>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>السؤال</TableHead>
                <TableHead>نسبة الخطأ</TableHead>
                <TableHead>نسبة الصحة</TableHead>
                <TableHead>إجابات الطلاب</TableHead>
                <TableHead>متوسط الوقت</TableHead>
                <TableHead>الصعوبة</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.map((question) => {
                const difficulty = difficultyBadge(question.difficulty)
                const status = statusBadge(question)

                return (
                  <TableRow key={question.questionId}>
                    <TableCell className="max-w-[340px]">
                      <div className="line-clamp-2 leading-6" title={question.questionText}>
                        {question.questionText}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-red-600">{question.incorrectRate.toFixed(1)}%</span>
                          {question.incorrectRate >= 50 ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <Progress value={question.incorrectRate} className="h-2" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium">{question.correctRate.toFixed(1)}%</span>
                    </TableCell>

                    <TableCell>{question.answerCount.toLocaleString("ar-SA")}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{question.averageTime.toLocaleString("ar-SA")} ث</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={difficulty.className}>{difficulty.label}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">
              لا توجد إجابات طلاب محفوظة لتحليل الأسئلة ضمن البحث أو الفترة المحددة.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

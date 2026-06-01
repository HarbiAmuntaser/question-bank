"use client"

import { useMemo, useState } from "react"
import { Clock, Search, TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AnalyticsData } from "@/types/analytics"

interface QuizAnalyticsTableProps {
  data: AnalyticsData["quizPerformance"]
}

type SortableQuizKey = "title" | "attempts" | "averageScore" | "averageTime" | "completionRate"

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes <= 0) return `${seconds.toLocaleString("ar-SA")} ث`
  return `${minutes.toLocaleString("ar-SA")} دقيقة`
}

function difficultyBadge(difficulty: AnalyticsData["quizPerformance"][number]["difficulty"]) {
  switch (difficulty) {
    case "easy":
      return { label: "سهل", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" }
    case "medium":
      return { label: "متوسط", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" }
    case "hard":
      return { label: "صعب", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
  }
}

export function QuizAnalyticsTable({ data }: QuizAnalyticsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortableQuizKey>("attempts")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const sortedData = useMemo(() => {
    const filteredData = data.filter((quiz) => quiz.title.toLowerCase().includes(searchTerm.trim().toLowerCase()))

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [data, searchTerm, sortBy, sortOrder])

  const handleSort = (column: SortableQuizKey) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortBy(column)
    setSortOrder("desc")
  }

  const SortIcon = sortOrder === "asc" ? TrendingUp : TrendingDown

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-base">أكثر الاختبارات استخدامًا وأداءها</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">المصدر: QuizAttempt.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث في الاختبارات..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 pr-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow>
                {[
                  ["title", "اسم الاختبار"],
                  ["attempts", "المحاولات"],
                  ["averageScore", "متوسط الدرجة"],
                  ["averageTime", "متوسط الوقت"],
                  ["completionRate", "معدل الإكمال"],
                ].map(([key, label]) => (
                  <TableHead key={key}>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md py-1 text-right hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleSort(key as SortableQuizKey)}
                    >
                      {label}
                      {sortBy === key && <SortIcon className="h-4 w-4" />}
                    </button>
                  </TableHead>
                ))}
                <TableHead>الصعوبة</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedData.map((quiz) => {
                const difficulty = difficultyBadge(quiz.difficulty)

                return (
                  <TableRow key={quiz.quizId}>
                    <TableCell className="font-medium">
                      <div className="max-w-[260px] truncate" title={quiz.title}>
                        {quiz.title}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium">{quiz.attempts.toLocaleString("ar-SA")}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quiz.averageScore.toFixed(1)}%</span>
                        {quiz.averageScore >= 80 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : quiz.averageScore >= 60 ? (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm">{formatTime(quiz.averageTime)}</span>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium">{quiz.completionRate.toFixed(1)}%</span>
                    </TableCell>

                    <TableCell>
                      <Badge className={difficulty.className}>{difficulty.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {sortedData.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">لا توجد محاولات اختبارات تطابق البحث أو الفترة المحددة.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

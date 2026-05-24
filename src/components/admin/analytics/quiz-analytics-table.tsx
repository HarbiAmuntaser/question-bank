"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, TrendingUp, TrendingDown, Clock } from "lucide-react"
import type { AnalyticsData } from "@/types/analytics"

interface QuizAnalyticsTableProps {
  data: AnalyticsData["quizPerformance"]
}

type SortableQuizKey = "title" | "attempts" | "averageScore" | "averageTime" | "completionRate"

export function QuizAnalyticsTable({ data }: QuizAnalyticsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortableQuizKey>("attempts")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const sortedData = useMemo(() => {
    const filteredData = data.filter((quiz) => quiz.title.toLowerCase().includes(searchTerm.toLowerCase()))

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes <= 0) return `${seconds} ث`
    return `${minutes} دقيقة`
  }

  const getDifficultyColor = (difficulty: AnalyticsData["quizPerformance"][number]["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    }
  }

  const getDifficultyText = (difficulty: AnalyticsData["quizPerformance"][number]["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "سهل"
      case "medium":
        return "متوسط"
      case "hard":
        return "صعب"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <CardTitle>تحليل أداء الاختبارات</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="البحث في الاختبارات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("title")}>
                  <div className="flex items-center gap-2">
                    اسم الاختبار
                    {sortBy === "title" &&
                      (sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
                  </div>
                </TableHead>

                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("attempts")}>
                  <div className="flex items-center gap-2">
                    المحاولات
                    {sortBy === "attempts" &&
                      (sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
                  </div>
                </TableHead>

                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("averageScore")}>
                  <div className="flex items-center gap-2">
                    متوسط الدرجات
                    {sortBy === "averageScore" &&
                      (sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
                  </div>
                </TableHead>

                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("averageTime")}>
                  <div className="flex items-center gap-2">
                    متوسط الوقت
                    {sortBy === "averageTime" &&
                      (sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
                  </div>
                </TableHead>

                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("completionRate")}>
                  <div className="flex items-center gap-2">
                    معدل الإكمال
                    {sortBy === "completionRate" &&
                      (sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
                  </div>
                </TableHead>

                <TableHead>الصعوبة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedData.map((quiz) => (
                <TableRow key={quiz.quizId}>
                  <TableCell className="font-medium">
                    <div className="max-w-[220px] truncate" title={quiz.title}>
                      {quiz.title}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{quiz.attempts}</span>
                      <span className="text-xs text-muted-foreground">محاولة</span>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{quiz.completionRate.toFixed(1)}%</span>
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${quiz.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge className={getDifficultyColor(quiz.difficulty)}>{getDifficultyText(quiz.difficulty)}</Badge>
                  </TableCell>

                  <TableCell>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2" disabled>
                      <Eye className="h-4 w-4" />
                      تفاصيل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sortedData.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">لا توجد اختبارات تطابق البحث</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
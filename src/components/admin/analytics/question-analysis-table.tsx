"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import type { AnalyticsData } from "@/types/analytics"

interface QuestionAnalysisTableProps {
  data: AnalyticsData["questionAnalysis"]
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

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getPerformanceIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (rate >= 60) return <Clock className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const getDifficultyColor = (difficulty: AnalyticsData["questionAnalysis"][number]["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    }
  }

  const getDifficultyText = (difficulty: AnalyticsData["questionAnalysis"][number]["difficulty"]) => {
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
          <CardTitle>تحليل أداء الأسئلة</CardTitle>

          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="البحث في الأسئلة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">جميع المستويات</option>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>السؤال</TableHead>
                <TableHead>معدل الإجابة الصحيحة</TableHead>
                <TableHead>متوسط الوقت</TableHead>
                <TableHead>الصعوبة</TableHead>
                <TableHead>العلامات</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.map((question) => (
                <TableRow key={question.questionId}>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate" title={question.questionText}>
                      {question.questionText}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-medium ${getPerformanceColor(question.correctRate)}`}>
                          {question.correctRate.toFixed(1)}%
                        </span>
                        {getPerformanceIcon(question.correctRate)}
                      </div>
                      <Progress value={question.correctRate} className="h-2" />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{question.averageTime} ث</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {getDifficultyText(question.difficulty)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {question.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {question.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{question.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {question.correctRate < 50 ? (
                      <Badge variant="destructive">يحتاج مراجعة</Badge>
                    ) : question.correctRate < 70 ? (
                      <Badge variant="secondary">متوسط</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">ممتاز</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">لا توجد أسئلة تطابق البحث</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
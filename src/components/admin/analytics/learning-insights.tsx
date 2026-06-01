"use client"

import { AlertTriangle, BarChart3, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { AnalyticsData } from "@/types/analytics"

type LearningInsightsProps = {
  quizzes: AnalyticsData["quizPerformance"]
  questions: AnalyticsData["questionAnalysis"]
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export function LearningInsights({ quizzes, questions }: LearningInsightsProps) {
  const topQuizzes = quizzes
    .filter((quiz) => quiz.attempts > 0)
    .slice()
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5)

  const hardestQuestions = questions
    .filter((question) => question.answerCount > 0)
    .slice()
    .sort((a, b) => {
      if (b.incorrectRate !== a.incorrectRate) return b.incorrectRate - a.incorrectRate
      return b.answerCount - a.answerCount
    })
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            أكثر الاختبارات استخدامًا
          </CardTitle>
          <p className="text-xs text-muted-foreground">مرتبة حسب عدد المحاولات من QuizAttempt.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {topQuizzes.length === 0 ? (
            <EmptyState label="لا توجد محاولات اختبارات محفوظة بعد." />
          ) : (
            topQuizzes.map((quiz, index) => (
              <div key={quiz.quizId} className="rounded-lg border p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                    <h3 className="truncate text-sm font-semibold" title={quiz.title}>
                      {quiz.title}
                    </h3>
                  </div>
                  <Badge variant="secondary">{quiz.attempts.toLocaleString("ar-SA")} محاولة</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <span className="block">متوسط الدرجة</span>
                    <strong className="text-sm text-foreground">{quiz.averageScore.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="block">معدل الإكمال</span>
                    <strong className="text-sm text-foreground">{quiz.completionRate.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            أصعب الأسئلة
          </CardTitle>
          <p className="text-xs text-muted-foreground">مرتبة حسب نسبة الخطأ من UserAnswer.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hardestQuestions.length === 0 ? (
            <EmptyState label="لا توجد إجابات طلاب محفوظة لتحليل صعوبة الأسئلة." />
          ) : (
            hardestQuestions.map((question, index) => (
              <div key={question.questionId} className="rounded-lg border p-3">
                <div className="mb-3 flex items-start gap-3">
                  <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-6" title={question.questionText}>
                      {question.questionText}
                    </h3>
                  </div>
                  <Badge variant={question.incorrectRate >= 70 ? "destructive" : "secondary"}>
                    خطأ {question.incorrectRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{question.answerCount.toLocaleString("ar-SA")} إجابة</span>
                    <span>صحيح {question.correctRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={question.incorrectRate} className="h-2" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

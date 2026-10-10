import { BarChart3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/types/analytics"

export function LearningInsights({ quizzes }: { quizzes: AnalyticsData["quizPerformance"] }) {
  const topQuizzes = quizzes.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          أكثر الاختبارات استخدامًا
        </CardTitle>
        <p className="text-xs text-muted-foreground">أعلى خمسة اختبارات حسب المحاولات خلال الفترة المختارة.</p>
      </CardHeader>
      <CardContent>
        {topQuizzes.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {topQuizzes.map((quiz, index) => (
              <div key={quiz.quizId} className="rounded-md border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <Badge variant="secondary">{quiz.attempts.toLocaleString("ar-SA")}</Badge>
                </div>
                <p className="line-clamp-2 min-h-10 text-sm font-semibold" title={quiz.title}>{quiz.title}</p>
                <div className="mt-3 text-xs text-muted-foreground">متوسط الدرجة: {quiz.averageScore.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد محاولات اختبارات ضمن الفترة المختارة.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

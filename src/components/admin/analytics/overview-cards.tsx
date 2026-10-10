import { CheckCircle, ClipboardCheck, Clock, FileText, HelpCircle, TrendingUp, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/types/analytics"

export function OverviewCards({ data }: { data: AnalyticsData["overview"] }) {
  const cards = [
    { title: "جلسات الطلاب", value: data.studentSessions, icon: Users, description: "ضمن الفترة المختارة" },
    { title: "الاختبارات المتاحة", value: data.totalQuizzes, icon: FileText, description: "إجمالي الاختبارات النشطة" },
    { title: "الأسئلة المتاحة", value: data.totalQuestions, icon: HelpCircle, description: "إجمالي الأسئلة النشطة" },
    { title: "إجابات الطلاب", value: data.totalAnswers, icon: ClipboardCheck, description: "ضمن الفترة المختارة" },
    { title: "محاولات الاختبارات", value: data.totalAttempts, icon: Clock, description: "ضمن الفترة المختارة" },
    { title: "متوسط الدرجات", value: `${data.averageScore.toFixed(1)}%`, icon: TrendingUp, description: "للمحاولات المكتملة في الفترة" },
    { title: "معدل الإكمال", value: `${data.completionRate.toFixed(1)}%`, icon: CheckCircle, description: "من محاولات الفترة المختارة" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-6">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {typeof card.value === "number" ? card.value.toLocaleString("ar-SA") : card.value}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

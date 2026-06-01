"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, HelpCircle, TrendingUp, Clock, CheckCircle, ClipboardCheck } from "lucide-react"
import type { AnalyticsData } from "@/types/analytics"

interface OverviewCardsProps {
  data: AnalyticsData["overview"]
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const cards = [
    {
      title: "جلسات الطلاب",
      value: data.studentSessions.toLocaleString("ar-SA"),
      icon: Users,
      description: "من جلسات الطلاب المجهولة",
    },
    {
      title: "إجمالي الاختبارات",
      value: data.totalQuizzes.toLocaleString("ar-SA"),
      icon: FileText,
      description: "اختبار متاح",
    },
    {
      title: "إجمالي الأسئلة",
      value: data.totalQuestions.toLocaleString("ar-SA"),
      icon: HelpCircle,
      description: "سؤال في النظام",
    },
    {
      title: "إجابات الطلاب",
      value: data.totalAnswers.toLocaleString("ar-SA"),
      icon: ClipboardCheck,
      description: "من UserAnswer",
    },
    {
      title: "محاولات الاختبارات",
      value: data.totalAttempts.toLocaleString("ar-SA"),
      icon: Clock,
      description: "من QuizAttempt",
    },
    {
      title: "متوسط درجات الطلاب",
      value: `${data.averageScore.toFixed(1)}%`,
      icon: TrendingUp,
      description: "من محاولات الاختبارات المكتملة",
    },
    {
      title: "معدل الإكمال",
      value: `${data.completionRate.toFixed(1)}%`,
      icon: CheckCircle,
      description: "حسب المحاولات المكتملة",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-6">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{card.value}</div>
            <p className="mt-2 min-h-8 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/70" />
        </Card>
      ))}
    </div>
  )
}

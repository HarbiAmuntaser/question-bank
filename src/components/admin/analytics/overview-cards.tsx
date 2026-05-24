"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, HelpCircle, TrendingUp, Clock, CheckCircle } from "lucide-react"
import type { AnalyticsData } from "@/types/analytics"

interface OverviewCardsProps {
  data: AnalyticsData["overview"]
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const cards = [
    {
      title: "إجمالي المستخدمين",
      value: data.totalUsers.toLocaleString("ar-SA"),
      icon: Users,
      description: "مستخدم نشط",
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
      title: "إجمالي المحاولات",
      value: data.totalAttempts.toLocaleString("ar-SA"),
      icon: Clock,
      description: "محاولة اختبار",
    },
    {
      title: "متوسط الدرجات",
      value: `${data.averageScore.toFixed(1)}%`,
      icon: TrendingUp,
      description: "معدل الأداء العام",
    },
    {
      title: "معدل الإكمال",
      value: `${data.completionRate.toFixed(1)}%`,
      icon: CheckCircle,
      description: "نسبة إكمال الاختبارات",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="mt-2 text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
        </Card>
      ))}
    </div>
  )
}
// src/components/public/quiz/result/result-summary-card.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

function gradeColor(grade: string) {
  switch (grade) {
    case "ممتاز":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "جيد جداً":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "جيد":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "مقبول":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  }
}

export function ResultSummaryCard({ quizTitle, current }: { quizTitle: string; current: UiResult }) {
  return (
    <Card className="border bg-card/95 text-center shadow-sm">
      <CardHeader className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Trophy className="h-10 w-10 text-primary sm:h-12 sm:w-12" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">تم إكمال الاختبار!</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{quizTitle}</p>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-lg border bg-muted/25 p-3 text-center sm:p-4">
            <div className="mb-2 text-xl font-bold text-primary sm:text-3xl">
              {current.correctAnswers}/{current.totalQuestions}
            </div>
            <p className="text-sm text-muted-foreground">الإجابات الصحيحة</p>
          </div>

          <div className="rounded-lg border bg-muted/25 p-3 text-center sm:p-4">
            <div className="mb-2 text-xl font-bold text-primary sm:text-3xl">{Math.round(current.percentage)}%</div>
            <p className="text-sm text-muted-foreground">النسبة المئوية</p>
          </div>

          <div className="rounded-lg border bg-muted/25 p-3 text-center sm:p-4">
            <Badge className={`px-2.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-lg ${gradeColor(current.grade)}`}>{current.grade}</Badge>
            <p className="mt-2 text-sm text-muted-foreground">التقدير</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

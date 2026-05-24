// src/components/public/quiz/result/result-summary-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="text-center">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Trophy className="h-12 w-12 text-primary" aria-hidden />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold">تم إكمال الاختبار!</CardTitle>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{quizTitle}</p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {current.correctAnswers}/{current.totalQuestions}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">الإجابات الصحيحة</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">{Math.round(current.percentage)}%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">النسبة المئوية</p>
          </div>

          <div className="text-center">
            <Badge className={`text-lg px-4 py-2 ${gradeColor(current.grade)}`}>{current.grade}</Badge>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">التقدير</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// src/components/public/quiz/result/result-performance-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Star } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

export function ResultPerformanceCard({ current }: { current: UiResult }) {
  return (
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader className="p-5 sm:p-6">
        <CardTitle className="text-lg">تحليل الأداء</CardTitle>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900/60 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" aria-hidden />
            <div className="text-2xl font-bold text-green-600">{current.correctAnswers}</div>
            <p className="text-sm text-green-700 dark:text-green-300">إجابات صحيحة</p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/60 dark:bg-red-900/20">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" aria-hidden />
            <div className="text-2xl font-bold text-red-600">
              {Math.max(0, current.totalQuestions - current.correctAnswers)}
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">إجابات خاطئة</p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-900/60 dark:bg-blue-900/20">
            <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" aria-hidden />
            <div className="text-2xl font-bold text-blue-600">{current.earnedPoints}</div>
            <p className="text-sm text-blue-700 dark:text-blue-300">نقطة مكتسبة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

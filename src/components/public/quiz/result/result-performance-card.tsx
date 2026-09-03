// src/components/public/quiz/result/result-performance-card.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, XCircle, Star } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

export function ResultPerformanceCard({ current }: { current: UiResult }) {
  return (
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">تحليل الأداء</h2>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-900/60 dark:bg-green-900/20 sm:p-4">
            <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-600 sm:h-8 sm:w-8" aria-hidden />
            <div className="text-xl font-bold text-green-600 sm:text-2xl">{current.correctAnswers}</div>
            <p className="text-sm text-green-700 dark:text-green-300">إجابات صحيحة</p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-900/60 dark:bg-red-900/20 sm:p-4">
            <XCircle className="mx-auto mb-2 h-6 w-6 text-red-600 sm:h-8 sm:w-8" aria-hidden />
            <div className="text-xl font-bold text-red-600 sm:text-2xl">
              {Math.max(0, current.totalQuestions - current.correctAnswers)}
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">إجابات خاطئة</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center sm:p-4">
            <Star className="mx-auto mb-2 h-6 w-6 text-primary sm:h-8 sm:w-8" aria-hidden />
            <div className="text-xl font-bold text-primary sm:text-2xl">{current.earnedPoints}</div>
            <p className="text-sm text-foreground/75">نقطة مكتسبة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

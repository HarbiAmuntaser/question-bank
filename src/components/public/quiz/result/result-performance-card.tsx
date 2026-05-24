// src/components/public/quiz/result/result-performance-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Star } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

export function ResultPerformanceCard({ current }: { current: UiResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليل الأداء</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" aria-hidden />
            <div className="text-2xl font-bold text-green-600">{current.correctAnswers}</div>
            <p className="text-sm text-green-700 dark:text-green-300">إجابات صحيحة</p>
          </div>

          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" aria-hidden />
            <div className="text-2xl font-bold text-red-600">
              {Math.max(0, current.totalQuestions - current.correctAnswers)}
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">إجابات خاطئة</p>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" aria-hidden />
            <div className="text-2xl font-bold text-blue-600">{current.earnedPoints}</div>
            <p className="text-sm text-blue-700 dark:text-blue-300">نقطة مكتسبة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

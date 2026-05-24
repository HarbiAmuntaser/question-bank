// src/components/public/quiz/result/result-session-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

function toAr(dtISO: string) {
  try {
    return new Date(dtISO).toLocaleString("ar-SA");
  } catch {
    return dtISO;
  }
}

export function ResultSessionCard({
  current,
  quizTimeLimitMin,
}: {
  current: UiResult;
  quizTimeLimitMin: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" aria-hidden />
          تفاصيل المحاولة
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">وقت الإنهاء:</span>
          <span className="text-sm">{toAr(current.completedAtISO)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">معرّف الجلسة:</span>
          <span className="text-xs font-mono">{current.sessionId}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">عدد الأسئلة:</span>
          <span className="text-sm">
            {current.totalQuestions} (صحيح: {current.correctAnswers} / خطأ:{" "}
            {Math.max(0, current.totalQuestions - current.correctAnswers)})
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">الحد الزمني:</span>
          <span className="text-sm">{quizTimeLimitMin} دقيقة</span>
        </div>
      </CardContent>
    </Card>
  );
}

// src/components/public/quiz/result/result-stats-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;

  if (h > 0) return `${h} ساعة و ${m} دقيقة`;
  if (m > 0) return `${m} دقيقة و ${r} ثانية`;
  return `${r} ثانية`;
}

export function ResultStatsCard({
  current,
  quizTimeLimitMin,
}: {
  current: UiResult;
  quizTimeLimitMin: number;
}) {
  const durationLabel = current.durationSec > 0 ? formatDuration(current.durationSec) : "غير متاح";
  const rate =
    current.durationSec > 0
      ? Math.round((current.totalQuestions / current.durationSec) * 60)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" aria-hidden />
          إحصائيات مفصلة
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">النقاط المكتسبة:</span>
          <span className="font-bold">
            {current.earnedPoints} من {current.totalPoints || "—"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">الوقت المستغرق:</span>
          <span className="font-bold">{durationLabel}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">الحد الزمني:</span>
          <span className="font-bold">{quizTimeLimitMin} دقيقة</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">معدل الإجابة:</span>
          <span className="font-bold">{rate ? `${rate} سؤال/دقيقة` : "—"}</span>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>التقدم الإجمالي</span>
            <span>{Math.round(current.percentage)}%</span>
          </div>
          <Progress value={current.percentage} className="h-2" aria-label="تقدم الاختبار" />
        </div>
      </CardContent>
    </Card>
  );
}

// src/components/public/quiz/result/result-best-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import type { UiResult } from "./use-quiz-results";

export function ResultBestCard({
  attemptsCount,
  best,
  isCurrentBest,
}: {
  attemptsCount: number;
  best: UiResult | null;
  isCurrentBest: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" aria-hidden />
          أفضل نتيجة لك
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          عدد المحاولات على هذا الاختبار: <span className="font-medium text-foreground">{attemptsCount}</span>
        </div>

        {best ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">أفضل نسبة: {Math.round(best.percentage)}%</Badge>
            <Badge variant="secondary">التقدير: {best.grade}</Badge>
            {isCurrentBest ? <Badge>هذه محاولتك الأفضل ✅</Badge> : <Badge variant="outline">ليست الأفضل</Badge>}
          </div>
        ) : (
          <Badge variant="outline">لا توجد محاولات سابقة</Badge>
        )}
      </CardContent>
    </Card>
  );
}

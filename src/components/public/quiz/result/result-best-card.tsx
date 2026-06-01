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
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader className="p-5 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5" aria-hidden />
          أفضل نتيجة لك
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-5 pt-0 sm:p-6 sm:pt-0 md:flex-row md:items-center md:justify-between">
        <div className="text-sm leading-relaxed text-muted-foreground">
          عدد المحاولات على هذا الاختبار: <span className="font-medium text-foreground">{attemptsCount}</span>
        </div>

        {best ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md">أفضل نسبة: {Math.round(best.percentage)}%</Badge>
            <Badge variant="secondary" className="rounded-md">التقدير: {best.grade}</Badge>
            {isCurrentBest ? <Badge className="rounded-md">هذه محاولتك الأفضل</Badge> : <Badge variant="outline" className="rounded-md">ليست الأفضل</Badge>}
          </div>
        ) : (
          <Badge variant="outline" className="w-fit rounded-md">لا توجد محاولات سابقة</Badge>
        )}
      </CardContent>
    </Card>
  );
}

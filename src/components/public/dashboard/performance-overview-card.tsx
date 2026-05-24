// src/components/public/dashboard/performance-overview-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";

export function PerformanceOverviewCard({
  stats,
}: {
  stats: { totalQuizzes: number; averageScore: number; bestScore: number; streak: number };
}) {
  return (
<Card dir="rtl" className="text-right">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" aria-hidden />
          نظرة على الأداء
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Metric label="المعدل العام" value={stats.averageScore} />
        <Metric label="أفضل نتيجة" value={stats.bestScore} />

        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{stats.totalQuizzes}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">اختبار مكتمل</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{stats.streak}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">يوم متتالي</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>{label}</span>
        <span>{Math.round(v)}%</span>
      </div>
      <Progress value={v} className="h-2" aria-label={`${label} ${Math.round(v)}%`} />
    </div>
  );
}

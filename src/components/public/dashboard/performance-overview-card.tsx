// src/components/public/dashboard/performance-overview-card.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";

export function PerformanceOverviewCard({
  stats,
}: {
  stats: { totalQuizzes: number; averageScore: number; bestScore: number; streak: number };
}) {
  return (
    <Card dir="rtl" className="h-full text-right">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          نظرة على الأداء
        </h2>
      </CardHeader>

      <CardContent className="space-y-4">
        <Metric label="المعدل العام" value={stats.averageScore} />
        <Metric label="أفضل نتيجة" value={stats.bestScore} />

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{stats.totalQuizzes}</div>
              <p className="text-xs font-medium text-foreground/65">اختبار مكتمل</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{stats.streak}</div>
              <p className="text-xs font-medium text-foreground/65">يوم متتالي</p>
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
      <div className="mb-2 flex justify-between text-sm font-medium text-foreground/75">
        <span>{label}</span>
        <span>{Math.round(v)}%</span>
      </div>
      <Progress value={v} className="h-2" aria-label={`${label} ${Math.round(v)}%`} />
    </div>
  );
}

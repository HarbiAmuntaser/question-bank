// src/components/public/dashboard/stats-grid.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Trophy, Clock, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StatsGrid({
  stats,
}: {
  stats: { totalQuizzes: number; averageScore: number; totalTime: number; bestScore: number; streak: number };
}) {
  const totalSeconds = Math.max(0, stats.totalTime || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const timeValue = hours > 0 ? hours : minutes;
  const timeHint = hours > 0 ? "ساعة دراسة" : "دقيقة دراسة";

  return (
    <div dir="rtl" className="grid grid-cols-2 gap-3 text-right sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
      <StatCard title="إجمالي الاختبارات" value={stats.totalQuizzes} hint="اختبار مكتمل" Icon={BookOpen} />
      <StatCard title="المعدل العام" value={`${stats.averageScore}%`} hint="متوسط الدرجات" Icon={Target} />
      <StatCard title="أفضل نتيجة" value={`${stats.bestScore}%`} hint="أعلى درجة" Icon={Trophy} />
      <StatCard title="الوقت الإجمالي" value={timeValue} hint={timeHint} Icon={Clock} />
      <StatCard title="سلسلة الأيام" value={stats.streak} hint="يوم متتالي" Icon={TrendingUp} />
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  Icon,
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  Icon: LucideIcon;
}) {
  return (
    <Card dir="rtl" className="text-right last:col-span-2 md:last:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* الأرقام أفضل تكون LTR لتظهر صح */}
        <div className="text-xl font-bold sm:text-2xl" dir="ltr">
          {value}
        </div>
        <p className="mt-1 text-xs font-medium text-foreground/65">{hint}</p>
      </CardContent>
    </Card>
  );
}

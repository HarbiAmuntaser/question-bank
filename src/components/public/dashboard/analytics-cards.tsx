// src/components/public/dashboard/analytics-cards.tsx
"use client";

import type { QuizResult } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Target, Star, Clock, BarChart3 } from "lucide-react";

export function AnalyticsCards({
  results,
  stats,
}: {
  results: QuizResult[];
  stats: { totalQuizzes: number; averageScore: number; totalTime: number; bestScore: number; streak: number };
}) {
  const avgMinPerQuizRaw =
    stats.totalQuizzes > 0 ? stats.totalTime / stats.totalQuizzes / 60 : 0;

  // لو أقل من دقيقة، اعرض "<1" بدل 0
  const avgMinLabel = avgMinPerQuizRaw > 0 && avgMinPerQuizRaw < 1 ? "<1" : String(Math.round(avgMinPerQuizRaw));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <Card dir="rtl" className="h-full text-right">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            اتجاهات الأداء
          </h2>
        </CardHeader>

        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
                <div className="mb-2 text-3xl font-bold text-primary">{stats.averageScore}%</div>
                <p className="text-sm font-medium text-foreground/70">متوسط الأداء العام</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/25">
                  <Star className="mx-auto mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.bestScore}%</div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">أفضل نتيجة</p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                  <Clock className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden />
                  <div className="text-xl font-bold text-primary">{avgMinLabel}</div>
                  <p className="text-xs font-medium text-foreground/70">دقيقة/اختبار</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
              <p className="font-medium text-foreground/70">لا توجد بيانات كافية للتحليل</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card dir="rtl" className="h-full text-right">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" aria-hidden />
            توصيات للدراسة
          </h2>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {stats.totalQuizzes > 0 && stats.averageScore < 70 ? (
              <HintBox tone="warn" title="تحسين الأداء">
                معدلك الحالي {stats.averageScore}%. ننصح بمراجعة المواد والتركيز على نقاط الضعف.
              </HintBox>
            ) : null}

            {stats.streak === 0 ? (
              <HintBox tone="info" title="الانتظام في الدراسة">
                حاول أن تحل اختبار واحد على الأقل يومياً لبناء عادة دراسية منتظمة.
              </HintBox>
            ) : null}

            {stats.totalQuizzes > 0 && stats.averageScore >= 80 ? (
              <HintBox tone="good" title="أداء ممتاز!">
                أداؤك ممتاز بمعدل {stats.averageScore}%. استمر في هذا المستوى وجرب اختبارات أكثر تحدياً.
              </HintBox>
            ) : null}

            <div className="rounded-lg border bg-muted/25 p-4">
              <h3 className="mb-2 font-semibold">نصائح عامة</h3>
              <ul className="space-y-1 text-sm leading-relaxed text-foreground/75">
                <li>• راجع الأسئلة الخاطئة لتجنب تكرار الأخطاء</li>
                <li>• خصص وقتاً منتظماً للدراسة يومياً</li>
                <li>• ركز على المواضيع التي تحصل فيها على درجات أقل</li>
                <li>• استخدم تقنيات إدارة الوقت أثناء الاختبار</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HintBox({
  tone,
  title,
  children,
}: {
  tone: "warn" | "info" | "good";
  title: string;
  children: React.ReactNode;
}) {
  const cls =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100"
      : tone === "good"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100"
        : "border-primary/20 bg-primary/5 text-foreground";

  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed opacity-90">{children}</p>
    </div>
  );
}

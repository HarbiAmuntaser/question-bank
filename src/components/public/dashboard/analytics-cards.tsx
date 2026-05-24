// src/components/public/dashboard/analytics-cards.tsx
"use client";

import type { QuizResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Star, Clock, BarChart3 } from "lucide-react";

export function AnalyticsCards({
  results,
  stats,
}: {
  results: QuizResult[];
  stats: { totalQuizzes: number; averageScore: number; totalTime: number; bestScore: number; streak: number };
}) {
  const avgMinPerQuiz =
    stats.totalQuizzes > 0 ? Math.round((stats.totalTime / stats.totalQuizzes) / 60) : 0;
const avgMinPerQuizRaw =
  stats.totalQuizzes > 0 ? (stats.totalTime / stats.totalQuizzes) / 60 : 0;

// لو أقل من دقيقة، اعرض "<1" بدل 0
const avgMinLabel = avgMinPerQuizRaw > 0 && avgMinPerQuizRaw < 1 ? "<1" : String(Math.round(avgMinPerQuizRaw));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
<Card dir="rtl" className="text-right">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" aria-hidden />
            اتجاهات الأداء
          </CardTitle>
        </CardHeader>

        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-2">{stats.averageScore}%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">متوسط الأداء العام</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Star className="h-6 w-6 text-green-600 mx-auto mb-2" aria-hidden />
                  <div className="text-xl font-bold text-green-600">{stats.bestScore}%</div>
                  <p className="text-xs text-green-700 dark:text-green-300">أفضل نتيجة</p>
                </div>

                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" aria-hidden />
                  <div className="text-xl font-bold text-blue-600">{avgMinLabel}</div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">دقيقة/اختبار</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden />
              <p className="text-gray-600 dark:text-gray-400">لا توجد بيانات كافية للتحليل</p>
            </div>
          )}
        </CardContent>
      </Card>

<Card dir="rtl" className="text-right">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" aria-hidden />
            توصيات للدراسة
          </CardTitle>
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

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">نصائح عامة</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
      : tone === "good"
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
      : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
// داخل AnalyticsCards قبل return

  return (
    <div className={`p-4 rounded-lg border ${cls}`}>
      <h4 className="font-medium mb-2">{title}</h4>
      <p className="text-sm opacity-90">{children}</p>
      
    </div>
  );
}

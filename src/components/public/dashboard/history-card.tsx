// src/components/public/dashboard/history-card.tsx
"use client";

import type { QuizResult } from "@/types";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, BookOpen } from "lucide-react";
import { formatDuration, gradeColorClass, toDate } from "./dashboard-utils";

export function HistoryCard({ results }: { results: QuizResult[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الاختبارات الكامل</CardTitle>
      </CardHeader>

      <CardContent>
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result) => {
              const d = toDate(result.completedAt);
              return (
                <div
                  key={result.sessionId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full" aria-hidden>
                      <Award className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <h3 className="font-medium">محاولة #{result.sessionId.slice(-8)}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {d
                          ? d.toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <Badge className={gradeColorClass(result.grade)}>{result.grade}</Badge>
                      <span className="font-bold">{Math.round(result.percentage)}%</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {result.correctAnswers}/{result.totalQuestions} • {formatDuration(result.duration)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty />
        )}
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="text-center py-12">
      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" aria-hidden />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد اختبارات بعد</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">ابدأ رحلتك التعليمية واختبر معلوماتك</p>
      <Button asChild>
        <Link href="/">العودة للصفحة الرئيسية</Link>
      </Button>
    </div>
  );
}

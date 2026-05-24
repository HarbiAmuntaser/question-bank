// src/components/public/dashboard/recent-activity-card.tsx
"use client";

import type { QuizResult } from "@/types";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Trophy } from "lucide-react";
import { gradeColorClass, toDate } from "./dashboard-utils";

export function RecentActivityCard({ recentResults }: { recentResults: QuizResult[] }) {
  return (
<Card dir="rtl" className="text-right">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" aria-hidden />
          النشاط الأخير
        </CardTitle>
      </CardHeader>

      <CardContent>
        {recentResults.length > 0 ? (
          <div className="space-y-4">
            {recentResults.map((result) => {
              const d = toDate(result.completedAt);
              return (
                <div
                  key={result.sessionId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full" aria-hidden>
                      <Trophy className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">محاولة #{result.sessionId.slice(-6)}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {d ? d.toLocaleDateString("ar-SA") : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge className={gradeColorClass(result.grade)}>{result.grade}</Badge>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{Math.round(result.percentage)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden />
      <p className="text-gray-600 dark:text-gray-400">لم تقم بأي اختبار بعد</p>
      <Button asChild className="mt-4">
        <Link href="/">ابدأ من الصفحة الرئيسية</Link>
      </Button>
    </div>
  );
}

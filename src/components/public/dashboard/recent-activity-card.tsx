// src/components/public/dashboard/recent-activity-card.tsx
"use client";

import type { QuizResult } from "@/types";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Trophy } from "lucide-react";
import { gradeColorClass, toDate } from "./dashboard-utils";

export function RecentActivityCard({ recentResults }: { recentResults: QuizResult[] }) {
  return (
    <Card dir="rtl" className="h-full text-right">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5 text-primary" aria-hidden />
          النشاط الأخير
        </h2>
      </CardHeader>

      <CardContent>
        {recentResults.length > 0 ? (
          <div className="space-y-4">
            {recentResults.map((result) => {
              const d = toDate(result.completedAt);
              return (
                <div
                  key={result.sessionId}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/25 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-full bg-primary/10 p-2" aria-hidden>
                      <Trophy className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">محاولة #{result.sessionId.slice(-6)}</p>
                      <p className="text-xs font-medium text-foreground/65">
                        {d ? d.toLocaleDateString("ar-SA") : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-left">
                    <Badge className={gradeColorClass(result.grade)}>{result.grade}</Badge>
                    <p className="mt-1 text-xs font-medium text-foreground/65" dir="ltr">{Math.round(result.percentage)}%</p>
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
    <div className="py-8 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
      <p className="font-medium text-foreground/70">لم تقم بأي اختبار بعد</p>
      <Button asChild className="mt-4">
        <Link href="/">ابدأ من الصفحة الرئيسية</Link>
      </Button>
    </div>
  );
}

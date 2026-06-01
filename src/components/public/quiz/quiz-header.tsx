// src/components/public/quiz/quiz-header.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ListChecks } from "lucide-react";
import { QuizTimer } from "./quiz-timer";

export function QuizHeader({
  title,
  description,
  questionIndex,
  totalQuestions,
  answeredCount,
  progress,
  timeRemaining,
  onTimeUp,
  onTimeUpdate,
  onOpenSubmit,
}: {
  title: string;
  description?: string | null;
  questionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  progress: number;
  timeRemaining: number;
  onTimeUp: () => void;
  onTimeUpdate: (t: number) => void;
  onOpenSubmit: () => void;
}) {
  return (
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <ListChecks className="h-4 w-4" aria-hidden />
              <span>جلسة اختبار</span>
            </div>
            <CardTitle className="text-xl font-bold leading-tight sm:text-2xl">{title}</CardTitle>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <QuizTimer initialTime={timeRemaining} onTimeUp={onTimeUp} onTimeUpdate={onTimeUpdate} />

            <Button onClick={onOpenSubmit} variant="outline" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg sm:w-auto" aria-label="تسليم الاختبار">
              <CheckCircle className="h-4 w-4" />
              تسليم الاختبار
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="outline" className="w-fit rounded-md bg-background px-2.5 py-1" aria-label="رقم السؤال الحالي">
              السؤال {questionIndex} من {totalQuestions}
            </Badge>
            <span aria-label="عدد الأسئلة المجابة">تمت الإجابة على {answeredCount} من {totalQuestions}</span>
          </div>

          <Progress value={progress} className="h-2.5" aria-label="تقدم الاختبار" />
        </div>
      </CardContent>
    </Card>
  );
}

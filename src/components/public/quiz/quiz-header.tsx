// src/components/public/quiz/quiz-header.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
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
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            {description ? (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{description}</p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            {/* Stack timer/actions on mobile so touch targets never collide. */}
            {/* الوصولية: timer live region داخل QuizTimer إن أمكن */}
            <QuizTimer initialTime={timeRemaining} onTimeUp={onTimeUp} onTimeUpdate={onTimeUpdate} />

            <Button onClick={onOpenSubmit} variant="outline" className="flex h-11 w-full items-center gap-2 sm:w-auto" aria-label="تسليم الاختبار">
              <CheckCircle className="h-4 w-4" />
              تسليم الاختبار
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span aria-label="رقم السؤال الحالي">
              السؤال {questionIndex} من {totalQuestions}
            </span>
            <span aria-label="عدد الأسئلة المجابة">تم الإجابة على {answeredCount} سؤال</span>
          </div>

          {/* Progressbar وصولية */}
          <Progress value={progress} className="h-2" aria-label="تقدم الاختبار" />
        </div>
      </CardContent>
    </Card>
  );
}

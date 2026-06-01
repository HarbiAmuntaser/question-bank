// src/components/public/quiz/resume-attempt-dialog.tsx
"use client";

import { useCallback } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw, PlayCircle } from "lucide-react";

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function ResumeAttemptDialog({
  open,
  quizTitle,
  resumeInfo,
  onResume,
  onRestart,
}: {
  open: boolean;
  quizTitle: string;
  resumeInfo: {
    answeredCount: number;
    totalQuestions: number;
    currentIndex: number; // 0-based
    timeRemaining: number; // seconds
    startTime?: string;
  };
  onResume: () => void;
  onRestart: () => void;
}) {
  // منع الإغلاق بدون اختيار (Escape/Overlay) — نخليه “مودال”
  const onOpenChange = useCallback(() => {
    /* لا شيء */
  }, []);

  const percent =
    resumeInfo.totalQuestions > 0
      ? Math.round((resumeInfo.answeredCount / resumeInfo.totalQuestions) * 100)
      : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-right">
            <Clock className="h-5 w-5" />
            وجدنا محاولة غير مكتملة
          </AlertDialogTitle>

          <AlertDialogDescription className="text-right leading-relaxed">
            لديك محاولة غير مكتملة لاختبار: <span className="font-medium">{quizTitle}</span>. اختر متابعة المحاولة أو بدء محاولة جديدة من الصفر.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">الأسئلة المجابة</span>
            <Badge variant="secondary">
              {resumeInfo.answeredCount} / {resumeInfo.totalQuestions} ({percent}%)
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">آخر سؤال كنت عنده</span>
            <Badge variant="outline">{resumeInfo.currentIndex + 1}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">الوقت المتبقي</span>
            <Badge variant="outline" className="tabular-nums">
              {formatTime(resumeInfo.timeRemaining)}
            </Badge>
          </div>
        </div>

        <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-start">
          <Button
            type="button"
            onClick={onRestart}
            className="h-11 w-full gap-2 rounded-lg sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            بدء محاولة جديدة
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onResume}
            className="h-11 w-full gap-2 rounded-lg sm:w-auto"
          >
            <PlayCircle className="h-4 w-4" />
            متابعة المحاولة
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

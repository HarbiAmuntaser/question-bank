"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface QuizSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  answeredQuestions: number;
  onConfirm: () => void;
}

export function QuizSubmissionDialog({
  open,
  onOpenChange,
  totalQuestions,
  answeredQuestions,
  onConfirm,
}: QuizSubmissionDialogProps) {
  const safeTotal = Math.max(0, totalQuestions);
  const safeAnswered = Math.max(0, Math.min(answeredQuestions, safeTotal));
  const unansweredQuestions = Math.max(0, safeTotal - safeAnswered);
  const completionPercentage = safeTotal > 0 ? Math.round((safeAnswered / safeTotal) * 100) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-right">
            <Clock className="h-5 w-5" aria-hidden />
            تسليم الاختبار
          </AlertDialogTitle>

          <AlertDialogDescription className="text-right leading-relaxed">
            هل أنت متأكد من رغبتك في تسليم الاختبار؟ لن تتمكن من تعديل إجاباتك بعد التسليم.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">إجمالي الأسئلة:</span>
              <Badge variant="outline">{safeTotal}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" aria-hidden />
                تم الإجابة:
              </span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                {safeAnswered}
              </Badge>
            </div>

            {unansweredQuestions > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden />
                  لم يتم الإجابة:
                </span>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  {unansweredQuestions}
                </Badge>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium">نسبة الإكمال:</span>
              <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                {completionPercentage}%
              </Badge>
            </div>
          </div>

          {unansweredQuestions > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" aria-hidden />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                لديك {unansweredQuestions} سؤال لم تتم الإجابة عليه. الأسئلة غير المجابة ستحصل على صفر نقطة.
              </p>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter className="mt-4 gap-2 sm:justify-start">
          <AlertDialogCancel className="h-11 rounded-lg">مراجعة الإجابات</AlertDialogCancel>

          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            className="h-11 rounded-lg bg-red-600 hover:bg-red-700"
          >
            تسليم الاختبار
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import React, { memo, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionWithOptions, QuizAnswer } from "@/types";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizNavigationProps {
  questions: QuestionWithOptions[];
  answers: Record<string, QuizAnswer>;
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
  sticky?: boolean;
  className?: string;
}

type NavBtnProps = {
  n: number;
  isAnswered: boolean;
  isCurrent: boolean;
  onSelect: (index: number) => void;
};

const NavButton = memo(
  function NavButton({ n, isAnswered, isCurrent, onSelect }: NavBtnProps) {
    const Icon = isAnswered ? CheckCircle : isCurrent ? AlertCircle : Circle;
    const variant = isCurrent ? "default" : isAnswered ? "outline" : "ghost";

    return (
      <Button
        type="button"
        variant={variant as any}
        size="sm"
        onClick={() => onSelect(n - 1)}
        className="h-10 w-full flex items-center justify-center gap-1 text-xs"
        aria-current={isCurrent ? "true" : "false"}
        aria-label={`الانتقال للسؤال رقم ${n}`}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            isAnswered ? "text-green-600" : isCurrent ? "text-blue-600" : "text-gray-400"
          )}
        />
        {n}
      </Button>
    );
  },
  (prev, next) => prev.isAnswered === next.isAnswered && prev.isCurrent === next.isCurrent
);

export const QuizNavigation = memo(function QuizNavigation({
  questions,
  answers,
  currentQuestionIndex,
  onQuestionSelect,
  sticky = true,
  className,
}: QuizNavigationProps) {
  const answeredIds = useMemo(() => new Set(Object.keys(answers)), [answers]);

  const answeredCount = answeredIds.size;
  const totalQuestions = questions.length;
  const percent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const onSelect = useCallback(
    (index: number) => onQuestionSelect(index),
    [onQuestionSelect]
  );

  const firstUnansweredIndex = useMemo(() => {
    if (answeredCount === totalQuestions) return -1;
    for (let i = 0; i < questions.length; i++) {
      if (!answeredIds.has(questions[i].id)) return i;
    }
    return -1;
  }, [answeredIds, answeredCount, totalQuestions, questions]);

  return (
    <Card className={cn(sticky ? "sticky top-4" : "", className)}>
      <CardHeader>
        <CardTitle className="text-lg">خريطة الأسئلة</CardTitle>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {answeredCount} من {totalQuestions}
          </span>
          <Badge variant="outline">{percent}%</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>تم الإجابة: {answeredCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Circle className="h-4 w-4 text-gray-400" />
            <span>لم يتم الإجابة: {Math.max(0, totalQuestions - answeredCount)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span>السؤال الحالي</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {questions.map((q, idx) => (
            <NavButton
              key={q.id}
              n={idx + 1}
              isAnswered={answeredIds.has(q.id)}
              isCurrent={idx === currentQuestionIndex}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (firstUnansweredIndex !== -1) onSelect(firstUnansweredIndex);
            }}
            disabled={answeredCount === totalQuestions || firstUnansweredIndex === -1}
            className="w-full"
          >
            الانتقال للسؤال التالي غير المجاب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

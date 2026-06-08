// src/components/public/quiz/quiz-footer-controls.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuizFooterControls({
  isLast,
  isFirst,
  onPrev,
  onNext,
  onSubmit,
  className,
}: {
  isLast: boolean;
  isFirst: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("border bg-card/95 shadow-sm", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:justify-between">
          <Button variant="outline" onClick={onPrev} disabled={isFirst} aria-disabled={isFirst} className="h-12 w-full gap-2 rounded-lg lg:w-auto">
            <ArrowRight className="h-4 w-4" aria-hidden />
            السابق
          </Button>

          {isLast ? (
            <Button onClick={onSubmit} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg lg:w-auto" aria-label="تسليم الاختبار">
              <CheckCircle className="h-4 w-4" />
              تسليم الاختبار
            </Button>
          ) : (
            <Button onClick={onNext} aria-label="السؤال التالي" className="h-12 w-full gap-2 rounded-lg lg:w-auto">
              التالي
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

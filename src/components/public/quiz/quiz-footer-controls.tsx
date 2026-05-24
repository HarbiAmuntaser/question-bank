// src/components/public/quiz/quiz-footer-controls.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export function QuizFooterControls({
  isLast,
  isFirst,
  onPrev,
  onNext,
  onSubmit,
}: {
  isLast: boolean;
  isFirst: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev} disabled={isFirst} aria-disabled={isFirst}>
            السؤال السابق
          </Button>

          {isLast ? (
            <Button onClick={onSubmit} className="flex items-center gap-2" aria-label="تسليم الاختبار">
              <CheckCircle className="h-4 w-4" />
              تسليم الاختبار
            </Button>
          ) : (
            <Button onClick={onNext} aria-label="السؤال التالي">
              السؤال التالي
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

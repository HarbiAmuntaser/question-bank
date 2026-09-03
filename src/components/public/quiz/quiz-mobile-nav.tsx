"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ListChecks } from "lucide-react";
import { QuizNavigation } from "./quiz-navigation";
import type { QuestionWithOptions, QuizAnswer } from "@/types";

export function QuizMobileNav({
  questions,
  answers,
  currentQuestionIndex,
  onQuestionSelect,
}: {
  questions: QuestionWithOptions[];
  answers: Record<string, QuizAnswer>;
  currentQuestionIndex: number;
  onQuestionSelect: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const answeredCount = Object.keys(answers).length;

  const handleSelect = useCallback(
    (i: number) => {
      onQuestionSelect(i);
      setOpen(false); // ✅ يغلق الفهرس بعد الاختيار
    },
    [onQuestionSelect]
  );

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="flex h-11 w-full items-center justify-between gap-3 rounded-lg px-4">
            <span className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" aria-hidden />
              فهرس الأسئلة
            </span>
            <span className="text-xs font-medium text-foreground/70">
              {currentQuestionIndex + 1}/{questions.length} · أُجيب عن {answeredCount}
            </span>
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto pb-6" dir="rtl">
          <SheetHeader className="text-right">
            <SheetTitle>التنقل بين الأسئلة</SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <QuizNavigation
              questions={questions}
              answers={answers}
              currentQuestionIndex={currentQuestionIndex}
              onQuestionSelect={handleSelect}
              sticky={false} // ✅ داخل الشيت لا نريد sticky
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

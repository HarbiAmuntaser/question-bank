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
          <Button variant="outline" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg">
            <ListChecks className="h-4 w-4" />
            فهرس الأسئلة
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

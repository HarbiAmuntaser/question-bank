"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { BookOpen, BookOpenText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActivePanel = "quizzes" | "summaries";

export function SubjectLearningTabs({
  quizzesCount,
  summariesCount,
  quizzesContent,
  summariesContent,
}: {
  quizzesCount: number;
  summariesCount: number;
  quizzesContent: ReactNode;
  summariesContent: ReactNode;
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("quizzes");
  const hasSummaries = summariesCount > 0;

  if (!hasSummaries) return <>{quizzesContent}</>;

  const buttonClass = (active: boolean) =>
    cn(
      "h-11 w-full rounded-lg px-4 text-sm font-semibold sm:w-auto",
      active
        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        : "border bg-background text-foreground hover:bg-muted",
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
        <Button
          type="button"
          variant={activePanel === "quizzes" ? "default" : "outline"}
          className={buttonClass(activePanel === "quizzes")}
          onClick={() => setActivePanel("quizzes")}
          aria-pressed={activePanel === "quizzes"}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          عرض الاختبارات
          <span className="rounded-md bg-background/20 px-1.5 text-xs arabic-numbers">{quizzesCount}</span>
        </Button>

        <Button
          type="button"
          variant={activePanel === "summaries" ? "default" : "outline"}
          className={buttonClass(activePanel === "summaries")}
          onClick={() => setActivePanel("summaries")}
          aria-pressed={activePanel === "summaries"}
        >
          <BookOpenText className="h-4 w-4" aria-hidden />
          ملخصات المادة
          <span className="rounded-md bg-background/20 px-1.5 text-xs arabic-numbers">{summariesCount}</span>
        </Button>
      </div>

      <div>{activePanel === "quizzes" ? quizzesContent : summariesContent}</div>
    </div>
  );
}

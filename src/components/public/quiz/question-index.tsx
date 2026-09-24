"use client";

import { memo, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type QuestionIndexState = "unanswered" | "answered" | "correct" | "incorrect";

export type QuestionIndexItem = {
  id: string;
  number: number;
  state: QuestionIndexState;
};

const stateClasses: Record<QuestionIndexState, string> = {
  unanswered:
    "border-border bg-background text-foreground/75 hover:border-primary/50 hover:bg-muted",
  answered:
    "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  correct:
    "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200",
  incorrect:
    "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
};

const stateLabels: Record<QuestionIndexState, string> = {
  unanswered: "غير مجاب",
  answered: "تمت الإجابة",
  correct: "إجابة صحيحة",
  incorrect: "إجابة خاطئة",
};

export const QuestionIndex = memo(function QuestionIndex({
  items,
  activeIndex,
  onSelect,
  summary,
}: {
  items: QuestionIndexItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  summary?: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeButton = scrollContainerRef.current?.querySelector<HTMLElement>(
      `[data-question-index="${activeIndex}"]`,
    );
    activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIndex]);

  return (
    <section className="space-y-3" aria-label="فهرس الأسئلة">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">فهرس الأسئلة</h2>
        {summary ? <span className="text-xs font-medium text-muted-foreground">{summary}</span> : null}
      </div>

      <div
        ref={scrollContainerRef}
        className="question-index-scroll overflow-x-auto pb-1"
        role="navigation"
        aria-label="التنقل بين الأسئلة"
      >
        <div className="flex min-w-max gap-2 px-0.5 py-1">
          {items.map((item, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={item.id}
                type="button"
                data-question-index={index}
                onClick={() => onSelect(index)}
                aria-current={active ? "step" : undefined}
                aria-label={`السؤال ${item.number}، ${stateLabels[item.state]}`}
                className={cn(
                  "flex h-11 w-11 flex-none items-center justify-center rounded-full border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  stateClasses[item.state],
                  active && "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                {item.number}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
});

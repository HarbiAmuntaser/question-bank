"use client";

import { useMemo } from "react";

import type { QuestionWithOptions, QuizAnswer } from "@/types";
import { QuestionIndex, type QuestionIndexItem } from "./question-index";

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
  const answeredIds = useMemo(() => new Set(Object.keys(answers)), [answers]);
  const items = useMemo<QuestionIndexItem[]>(
    () =>
      questions.map((question, index) => ({
        id: question.id,
        number: index + 1,
        state: answeredIds.has(question.id) ? "answered" : "unanswered",
      })),
    [answeredIds, questions],
  );

  return (
    <div className="rounded-lg border bg-card/95 p-4 shadow-sm lg:hidden">
      <QuestionIndex
        items={items}
        activeIndex={currentQuestionIndex}
        onSelect={onQuestionSelect}
        summary={`أُجيب عن ${answeredIds.size} من ${questions.length}`}
      />
    </div>
  );
}

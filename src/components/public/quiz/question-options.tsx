"use client";

import React, { useCallback, useId, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionWithOptions, QuizAnswer } from "@/types";
import { cn } from "@/lib/utils";
import { RichQuestionContent } from "@/components/shared/rich-question-content";
import { detectTextDir, type TextDir } from "./text-direction";
import { getQuestionLang, trueFalseLabel } from "./question-language";

type Props = {
  question: QuestionWithOptions;
  answer?: QuizAnswer;
  onAnswerChange: (answer: QuizAnswer) => void;
  dir: TextDir; // اتجاه البطاقة حسب السؤال
};

export function QuestionOptions({ question, answer, onAnswerChange, dir }: Props) {
  const uid = useId();
  const groupName = `q-${question.id}`;

  const options = useMemo(() => question.options ?? [], [question.options]);
  const selectedOption = answer?.selectedOptionIds?.[0] ?? "";

  const handleMultipleChoiceChange = useCallback(
    (optionId: string) => {
      onAnswerChange({
        questionId: question.id,
        selectedOptionIds: [optionId],
        answeredAt: new Date(),
      });
    },
    [onAnswerChange, question.id]
  );

  const handleTrueFalseChange = useCallback(
    (value: boolean) => {
      onAnswerChange({
        questionId: question.id,
        booleanAnswer: value,
        answeredAt: new Date(),
      });
    },
    [onAnswerChange, question.id]
  );

  const handleTextAnswerChange = useCallback(
    (text: string) => {
      onAnswerChange({
        questionId: question.id,
        textAnswer: text,
        answeredAt: new Date(),
      });
    },
    [onAnswerChange, question.id]
  );

  // True/False labels حسب لغة السؤال
  const qLang = getQuestionLang(question.questionText);
  const tfTrue = trueFalseLabel(true, qLang);
  const tfFalse = trueFalseLabel(false, qLang);

  const maxText = question.questionType === "essay" ? 2000 : 500;
  const currentLen = (answer?.textAnswer ?? "").length;

  const rowClass = (selected: boolean) =>
    cn(
      "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary/35 hover:bg-muted/50 sm:min-h-14 sm:p-4",
      selected ? "border-primary/50 bg-primary/5 shadow-sm" : "bg-background",
      dir === "rtl" ? "flex-row-reverse text-right" : "flex-row text-left"
    );

  const inputClass = "h-5 w-5 shrink-0 accent-primary";

  // تحسين وصولية: fieldset + legend
  if (question.questionType === "multiple_choice") {
    return (
      <fieldset className="space-y-3" aria-label="خيارات الإجابة">
        <legend className="sr-only">اختر إجابة واحدة</legend>

        {options.map((option) => {
          const id = `${uid}-${groupName}-${option.id}`;
          const optDir = detectTextDir(option.optionText);

          return (
            <label key={option.id} htmlFor={id} className={rowClass(selectedOption === option.id)}>
              <input
                id={id}
                type="radio"
                name={groupName}
                className={inputClass}
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(e) => handleMultipleChoiceChange(e.target.value)}
              />

              {/* خيار قد يكون بلغة مختلفة عن لغة السؤال */}
              <div className="min-w-0 flex-1" dir={optDir}>
                <RichQuestionContent content={option.optionText} className="space-y-2" />
              </div>
            </label>
          );
        })}
      </fieldset>
    );
  }

  if (question.questionType === "true_false") {
    return (
      <fieldset className="space-y-3" aria-label="صح أو خطأ">
        <legend className="sr-only">اختر صحيح أو خطأ</legend>

        <label htmlFor={`${uid}-${groupName}-true`} className={rowClass(answer?.booleanAnswer === true)}>
          <input
            id={`${uid}-${groupName}-true`}
            type="radio"
            name={groupName}
            className={inputClass}
            value="true"
            checked={answer?.booleanAnswer === true}
            onChange={() => handleTrueFalseChange(true)}
          />
          <span className="flex-1" dir={dir}>
            {tfTrue}
          </span>
        </label>

        <label htmlFor={`${uid}-${groupName}-false`} className={rowClass(answer?.booleanAnswer === false)}>
          <input
            id={`${uid}-${groupName}-false`}
            type="radio"
            name={groupName}
            className={inputClass}
            value="false"
            checked={answer?.booleanAnswer === false}
            onChange={() => handleTrueFalseChange(false)}
          />
          <span className="flex-1" dir={dir}>
            {tfFalse}
          </span>
        </label>
      </fieldset>
    );
  }

  // short_answer / essay
  return (
    <div className="space-y-2">
      <Label htmlFor={`${uid}-${groupName}-text`}>إجابتك:</Label>

      <Textarea
        id={`${uid}-${groupName}-text`}
        placeholder={
          question.questionType === "essay"
            ? "اكتب إجابتك المفصلة هنا..."
            : "اكتب إجابتك القصيرة هنا..."
        }
        value={answer?.textAnswer || ""}
        onChange={(e) => handleTextAnswerChange(e.target.value)}
        rows={question.questionType === "essay" ? 8 : 3}
        className={cn("min-h-28 resize-none rounded-lg text-base leading-relaxed", dir === "rtl" ? "text-right" : "text-left")}
        maxLength={maxText}
        dir={dir}
      />

      <p
        className={cn(
          "text-[11px] text-gray-500 dark:text-gray-400",
          dir === "rtl" ? "text-right" : "text-left"
        )}
      >
        {currentLen}/{maxText}
      </p>
    </div>
  );
}

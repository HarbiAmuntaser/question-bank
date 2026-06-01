"use client";

import { useMemo } from "react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuestionWithOptions, QuizAnswer } from "@/types";
import { CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichQuestionContent } from "@/components/shared/rich-question-content";

import { detectTextDir, detectTextLang } from "./text-direction";
import { QuestionOptions } from "./question-options";

interface QuestionDisplayProps {
  question: QuestionWithOptions;
  questionNumber: number;
  answer?: QuizAnswer;
  onAnswerChange: (answer: QuizAnswer) => void;
}

const difficultyColor: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const difficultyText: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

export function QuestionDisplay({ question, questionNumber, answer, onAnswerChange }: QuestionDisplayProps) {
  const level = (question.difficultyLevel?.toLowerCase?.() ?? "medium") as string;
  const levelClass =
    difficultyColor[level] ?? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  const levelText = difficultyText[level] ?? question.difficultyLevel;

  // ✅ اكتشاف ذكي لاتجاه البطاقة حسب نص السؤال
  const dir = useMemo(() => detectTextDir(question.questionText), [question.questionText]);
  const lang = useMemo(() => detectTextLang(question.questionText), [question.questionText]);

  return (
    <Card className="w-full border bg-card/95 shadow-sm" dir={dir} lang={lang}>
      <CardHeader className="p-4 sm:p-6">
        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", dir === "rtl" ? "text-right" : "text-left")}>
          <CardTitle className="text-lg font-semibold leading-tight sm:text-xl">
            {lang === "en" ? `Question ${questionNumber}` : `السؤال ${questionNumber}`}
          </CardTitle>

          <div className={cn("flex flex-wrap items-center gap-2", dir === "rtl" ? "justify-start sm:justify-end" : "justify-start")}>
            <Badge className={cn("rounded-md", levelClass)}>{levelText}</Badge>
            <Badge variant="outline" className="flex items-center gap-1 rounded-md bg-background">
              <Star className="h-3 w-3" aria-hidden />
              {question.points} {lang === "en" ? "pts" : "نقطة"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
        {/* نص السؤال */}
        <div className={cn("prose max-w-none text-base leading-relaxed dark:prose-invert sm:prose-lg", dir === "rtl" ? "text-right" : "text-left")}>
          <RichQuestionContent content={question.questionText} textClassName="text-gray-900 dark:text-gray-100" />
        </div>

        {/* صورة السؤال */}
        {question.imageUrl ? (
          <figure className="relative w-full max-w-2xl mx-auto">
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              <Image
                src={question.imageUrl || "/placeholder.svg"}
                alt={lang === "en" ? "Question image" : "صورة توضيحية للسؤال"}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
                // DB-hosted question images stay runtime-safe without disabling all image optimization.
                unoptimized={question.imageUrl.startsWith("http")}
              />
            </div>
          </figure>
        ) : null}

        {/* الوسوم */}
        {question.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {question.tags.map((tag, index) => (
              <Badge key={`${question.id}-tag-${index}`} variant="secondary" className="text-xs" dir={detectTextDir(tag)}>
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* خيارات الإجابة (مفصولة بملف مستقل) */}
        <div className="space-y-4">
          <QuestionOptions question={question} answer={answer} onAnswerChange={onAnswerChange} dir={dir} />
        </div>

        {/* حالة الحفظ */}
        {answer ? (
          <div className={cn("flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300", dir === "rtl" ? "justify-start" : "justify-start")}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            <span>{lang === "en" ? "Answer saved" : "تم حفظ الإجابة"}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

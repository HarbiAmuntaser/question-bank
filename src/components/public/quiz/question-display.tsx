"use client";

import { useMemo } from "react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuestionWithOptions, QuizAnswer } from "@/types";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <Card className="w-full" dir={dir} lang={lang}>
      <CardHeader>
        <div className={cn("flex items-start justify-between gap-4", dir === "rtl" ? "text-right" : "text-left")}>
          <CardTitle className="text-lg">
            {lang === "en" ? `Question ${questionNumber}` : `السؤال ${questionNumber}`}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge className={levelClass}>{levelText}</Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="h-3 w-3" aria-hidden />
              {question.points} {lang === "en" ? "pts" : "نقطة"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* نص السؤال */}
        <div className={cn("prose prose-lg max-w-none dark:prose-invert", dir === "rtl" ? "text-right" : "text-left")}>
          <p className="text-gray-900 dark:text-gray-100 leading-relaxed">{question.questionText}</p>
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
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <div className="h-2 w-2 bg-green-500 rounded-full" aria-hidden />
            <span>{lang === "en" ? "Answer saved" : "تم حفظ الإجابة"}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

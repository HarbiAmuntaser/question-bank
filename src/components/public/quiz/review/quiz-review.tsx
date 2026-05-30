// src/components/public/quiz/review/quiz-review.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { QuizWithQuestions, QuizSession } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Info, RotateCcw } from "lucide-react";
import { makeQuizKeys, safeJsonParse } from "@/components/public/quiz/storage";
import { RichQuestionContent } from "@/components/shared/rich-question-content";
import { detectDir, dirTextAlign } from "./text-direction";

type Props = {
  quiz: QuizWithQuestions;
  sessionId?: string;
  onlyWrong?: boolean;
};

type ReviewItem = {
  question: any; // لأن explanation قد لا يكون ضمن النوع عندك
  answer: any;
  isCorrect: boolean;
  correctOption: any | null;
  userChoiceId: string;
  userText: string;
};

function loadSessionForReview(quizId: string, sessionId?: string) {
  // محاولات تحميل متعددة حسب ما هو متاح عندك
  const candidates = [
    sessionId ? `quiz_session_${quizId}_${sessionId}` : "",
    `quiz_session_${quizId}`,
    sessionId ? `quiz_session_${sessionId}` : "",
  ].filter(Boolean);

  for (const key of candidates) {
    const s = safeJsonParse<any>(localStorage.getItem(key));
    if (s && s.quizId === quizId) return s as QuizSession;
  }
  return null;
}

export default function QuizReview({ quiz, sessionId, onlyWrong }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const s = loadSessionForReview(quiz.id, sessionId);
    setSession(s);
  }, [quiz.id, sessionId]);

  const items: ReviewItem[] = useMemo(() => {
    if (!session) return [];

    const calc: ReviewItem[] = quiz.questions.map((q: any) => {
      const a = (session as any).answers?.[q.id];

      let isCorrect = false;
      let userText = "";
      const userChoiceId = a?.selectedOptionIds?.[0] || "";
      const correctOption = q.options?.find((o: any) => o.isCorrect) || null;

      if (!a) {
        isCorrect = false;
      } else if (q.questionType === "multiple_choice") {
        isCorrect = userChoiceId && correctOption ? userChoiceId === correctOption.id : false;
      } else if (q.questionType === "true_false") {
        const correctVal =
          (correctOption?.optionText ?? "").toLowerCase() === "true" || correctOption?.optionText === "صحيح";
        isCorrect = a.booleanAnswer === correctVal;
        userText = a.booleanAnswer === true ? "صحيح" : a.booleanAnswer === false ? "خطأ" : "";
      } else {
        // short_answer / essay
        isCorrect = !!a.textAnswer && a.textAnswer.trim().length > 0;
        userText = a.textAnswer || "";
      }

      return { question: q, answer: a, isCorrect, correctOption, userChoiceId, userText };
    });

    return onlyWrong ? calc.filter((x) => !x.isCorrect) : calc;
  }, [quiz.questions, session, onlyWrong]);

  const total = items.length;

  const safeIndex = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(Math.max(0, index), total - 1);
  }, [index, total]);

  const current = total > 0 ? items[safeIndex] : null;

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  const handleRetry = useCallback(() => {
    const keys = makeQuizKeys(quiz.id);
    try {
      localStorage.removeItem(keys.answers);
      localStorage.removeItem(keys.session);
      localStorage.removeItem(keys.active);
    } catch {}
    router.push(`/quiz/${encodeURIComponent(quiz.id)}?fresh=1`);
  }, [quiz.id, router]);

  if (!session) {
    return (
      <div className="text-center py-16 text-muted-foreground" aria-live="polite">
        لم يتم العثور على جلسة لهذا الاختبار. تأكد أنك سلّمت الاختبار ثم أعد فتح صفحة النتائج.
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="text-center py-16 space-y-4" aria-live="polite">
        <div className="text-muted-foreground">
          {onlyWrong ? "لا توجد أسئلة خاطئة — أحسنت!" : "لا توجد أسئلة لعرضها."}
        </div>

        {onlyWrong ? (
          <Button asChild variant="outline">
            <Link href={`/quiz/${encodeURIComponent(quiz.id)}/review?session=${encodeURIComponent(sessionId || "")}`}>
              عرض جميع الأسئلة
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const q = current!.question;
  const dir = detectDir(String(q.questionText || ""));
  const align = dirTextAlign(dir);

  const badgeColor = current!.isCorrect
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";

  const renderUserAnswer = () => {
    if (q.questionType === "multiple_choice") {
      const opt = q.options?.find((o: any) => o.id === current!.userChoiceId);
      return opt ? <RichQuestionContent content={opt.optionText} /> : <span className="text-muted-foreground">لم يجب</span>;
    }
    if (q.questionType === "true_false") {
      return current!.userText || <span className="text-muted-foreground">لم يجب</span>;
    }
    return current!.userText ? <RichQuestionContent content={current!.userText} /> : <span className="text-muted-foreground">لم يجب</span>;
  };

  const renderCorrectAnswer = () => {
    if (q.questionType === "multiple_choice" || q.questionType === "true_false") {
      return <RichQuestionContent content={current!.correctOption?.optionText ?? "-"} />;
    }
    // للأسئلة المقالية/القصيرة: نعرض explanation إن وُجد
    return q.explanation ? (
      <RichQuestionContent content={q.explanation} />
    ) : (
      <span className="text-muted-foreground">لا توجد إجابة نموذجية، قد تحتاج تصحيحاً يدوياً.</span>
    );
  };

  const baseReview = `/quiz/${encodeURIComponent(quiz.id)}/review?session=${encodeURIComponent(sessionId || "")}`;
  const toggleHref = onlyWrong ? baseReview : `${baseReview}&onlyWrong=1`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-2xl font-bold">مراجعة الأسئلة</CardTitle>

            <NoteBadge onlyWrong={!!onlyWrong} index={safeIndex} total={total} />
          </div>

          {/* أدوات سريعة (مهم للجوال) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="bg-transparent">
              <Link href={toggleHref}>{onlyWrong ? "عرض جميع الأسئلة" : "عرض الخاطئة فقط"}</Link>
            </Button>

            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden />
              إعادة المحاولة
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={safeIndex === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
            aria-label="السؤال السابق"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
            السابق
          </Button>

          <div className="text-sm text-muted-foreground">
            السؤال {safeIndex + 1} من {total}
          </div>

          <Button
            onClick={goNext}
            disabled={safeIndex === total - 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
            aria-label="السؤال التالي"
          >
            التالي
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
        </CardContent>
      </Card>

      {/* Question Card with smart direction */}
      <Card dir={dir}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className={`text-lg ${align}`}>السؤال {safeIndex + 1}</CardTitle>

            <Badge className={badgeColor} aria-label={current!.isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}>
              {current!.isCorrect ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" aria-hidden /> صحيح
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <XCircle className="h-4 w-4" aria-hidden /> خطأ
                </span>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Question text */}
          <div className={`prose prose-lg max-w-none dark:prose-invert ${align}`}>
            <RichQuestionContent content={q.questionText} />
          </div>

          {/* User answer */}
          <div className="space-y-2">
            <div className={`text-sm font-medium ${align}`}>إجابة الطالب:</div>
            <div
              className={`p-3 rounded-lg border ${align} ${
                current!.isCorrect ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
              }`}
            >
              {renderUserAnswer()}
            </div>
          </div>

          {/* Correct answer / explanation */}
          <div className="space-y-2">
            <div className={`text-sm font-medium inline-flex items-center gap-2 ${align}`}>
              <Info className="h-4 w-4" aria-hidden />
              الإجابة الصحيحة / التوضيح:
            </div>

            <div className={`p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/40 ${align}`}>
              {renderCorrectAnswer()}

              {/* إن كان هناك explanation إضافي للأسئلة الموضوعية */}
              {q.explanation && q.questionType !== "essay" && q.questionType !== "short_answer" ? (
                <div className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium">توضيح:</span>
                  <RichQuestionContent content={q.explanation} className="mt-1" />
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer nav (على الجوال ممتاز) */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={goPrev} disabled={safeIndex === 0} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" aria-hidden />
          السابق
        </Button>
        <Button onClick={goNext} disabled={safeIndex === total - 1} className="flex items-center gap-2">
          التالي
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function NoteBadge({ onlyWrong, index, total }: { onlyWrong: boolean; index: number; total: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="outline">
        {index + 1} / {total}
      </Badge>
      {onlyWrong ? (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">الخاطئة فقط</Badge>
      ) : (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">جميع الأسئلة</Badge>
      )}
    </div>
  );
}

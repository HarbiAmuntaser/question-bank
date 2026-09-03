"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  RotateCcw,
  XCircle,
} from "lucide-react";

import type {
  QuestionOption,
  QuestionWithOptions,
  QuizAnswer,
  QuizSession,
  QuizWithQuestions,
} from "@/types";
import { RichQuestionContent } from "@/components/shared/rich-question-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { makeQuizKeys, safeJsonParse } from "@/components/public/quiz/storage";
import { detectDir, dirTextAlign } from "./text-direction";
import {
  getQuestionLang,
  optionToBoolean,
  questionNumberLabel,
  trueFalseLabel,
} from "../question-language";
import type { TextLang } from "../text-direction";

type Props = {
  quiz: QuizWithQuestions;
  sessionId?: string;
  onlyWrong?: boolean;
};

type ReviewQuestion = QuestionWithOptions & {
  explanation?: string | null;
};

type ReviewItem = {
  question: ReviewQuestion;
  answer: QuizAnswer | undefined;
  questionNumber: number;
  isAnswered: boolean;
  isCorrect: boolean;
  correctOption: QuestionOption | null;
  userChoiceId: string;
  userText: string;
};

type ReviewSummary = {
  correct: number;
  wrong: number;
  unanswered: number;
};

function loadSessionForReview(quizId: string, sessionId?: string) {
  const candidates = [
    sessionId ? `quiz_session_${quizId}_${sessionId}` : "",
    `quiz_session_${quizId}`,
    sessionId ? `quiz_session_${sessionId}` : "",
  ].filter(Boolean);

  for (const key of candidates) {
    const session = safeJsonParse<QuizSession>(localStorage.getItem(key));
    if (session?.quizId === quizId) return session;
  }

  return null;
}

function reviewOptionText(question: ReviewQuestion, option: QuestionOption, lang: TextLang) {
  if (question.questionType !== "true_false") return option.optionText;

  const value = optionToBoolean(option.optionText);
  return value === null ? option.optionText : trueFalseLabel(value, lang);
}

function getSelectedOptionId(question: ReviewQuestion, answer: QuizAnswer | undefined) {
  if (!answer) return "";

  if (question.questionType === "multiple_choice") {
    return answer.selectedOptionIds?.[0] ?? "";
  }

  if (question.questionType === "true_false") {
    if (typeof answer.booleanAnswer === "boolean") {
      return question.options.find((option) => optionToBoolean(option.optionText) === answer.booleanAnswer)?.id ?? "";
    }
    return answer.selectedOptionIds?.[0] ?? "";
  }

  return "";
}

function calculateReviewItem(question: ReviewQuestion, answer: QuizAnswer | undefined, questionNumber: number): ReviewItem {
  const correctOption = question.options.find((option) => option.isCorrect) ?? null;
  const userChoiceId = getSelectedOptionId(question, answer);
  const isAnswered =
    question.questionType === "multiple_choice"
      ? Boolean(userChoiceId)
      : question.questionType === "true_false"
        ? typeof answer?.booleanAnswer === "boolean" || Boolean(userChoiceId)
        : Boolean(answer?.textAnswer?.trim());
  let isCorrect = false;
  let userText = "";

  if (!answer) {
    isCorrect = false;
  } else if (question.questionType === "multiple_choice") {
    isCorrect = Boolean(userChoiceId && correctOption && userChoiceId === correctOption.id);
  } else if (question.questionType === "true_false") {
    const correctValue = optionToBoolean(correctOption?.optionText);
    isCorrect =
      correctValue !== null
        ? answer.booleanAnswer === correctValue
        : Boolean(userChoiceId && correctOption && userChoiceId === correctOption.id);
    userText = answer.booleanAnswer === true ? "صحيح" : answer.booleanAnswer === false ? "خطأ" : "";
  } else {
    userText = answer.textAnswer ?? "";
    isCorrect = userText.trim().length > 0;
  }

  return { question, answer, questionNumber, isAnswered, isCorrect, correctOption, userChoiceId, userText };
}

function buildReviewSummary(items: ReviewItem[]): ReviewSummary {
  return items.reduce(
    (summary, item) => {
      if (!item.isAnswered) {
        summary.unanswered += 1;
      } else if (item.isCorrect) {
        summary.correct += 1;
      } else {
        summary.wrong += 1;
      }
      return summary;
    },
    { correct: 0, wrong: 0, unanswered: 0 },
  );
}

export default function QuizReview({ quiz, sessionId, onlyWrong }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setSession(loadSessionForReview(quiz.id, sessionId));
  }, [quiz.id, sessionId]);

  const allItems: ReviewItem[] = useMemo(() => {
    if (!session) return [];

    return quiz.questions.map((question, questionIndex) =>
      calculateReviewItem(question as ReviewQuestion, session.answers?.[question.id], questionIndex + 1),
    );
  }, [quiz.questions, session]);

  const items: ReviewItem[] = useMemo(
    () => (onlyWrong ? allItems.filter((item) => !item.isCorrect) : allItems),
    [allItems, onlyWrong],
  );

  const summary = useMemo(() => buildReviewSummary(allItems), [allItems]);

  const total = items.length;

  const safeIndex = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(Math.max(0, index), total - 1);
  }, [index, total]);

  const current = total > 0 ? items[safeIndex] : null;

  const goPrev = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);
  const goNext = useCallback(() => setIndex((value) => Math.min(total - 1, value + 1)), [total]);

  const handleRetry = useCallback(() => {
    const keys = makeQuizKeys(quiz.id);
    try {
      localStorage.removeItem(keys.answers);
      localStorage.removeItem(keys.session);
      localStorage.removeItem(keys.active);
    } catch {
      // Ignore storage errors and let the fresh attempt route handle state.
    }
    router.push(`/quiz/${encodeURIComponent(quiz.id)}?fresh=1`);
  }, [quiz.id, router]);

  if (!session) {
    return (
      <div className="py-16 text-center text-muted-foreground" aria-live="polite">
        لم يتم العثور على جلسة لهذا الاختبار. تأكد أنك سلّمت الاختبار ثم أعد فتح صفحة النتائج.
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="space-y-4 py-16 text-center" aria-live="polite">
        <div className="text-muted-foreground">
          {onlyWrong ? "لا توجد أسئلة خاطئة - أحسنت!" : "لا توجد أسئلة لعرضها."}
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
  const lang = getQuestionLang(q.questionText);
  const align = dirTextAlign(dir);
  const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
  const showExplanation = !current!.isCorrect && explanation.length > 0;
  const badgeColor = current!.isCorrect
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  const baseReview = `/quiz/${encodeURIComponent(quiz.id)}/review?session=${encodeURIComponent(sessionId || "")}`;
  const toggleHref = onlyWrong ? baseReview : `${baseReview}&onlyWrong=1`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-4 sm:px-4 sm:py-6 lg:space-y-6 lg:px-0">
      <Card className="border bg-card/95 shadow-sm">
        <CardHeader className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-tight">مراجعة الأسئلة</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                راجع السؤال، الخيارات، اختيارك، والإجابة الصحيحة بوضوح.
              </p>
            </div>

            <NoteBadge onlyWrong={!!onlyWrong} index={safeIndex} total={total} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-11 rounded-lg bg-transparent">
              <Link href={toggleHref}>{onlyWrong ? "عرض جميع الأسئلة" : "عرض الخاطئة فقط"}</Link>
            </Button>

            <Button onClick={handleRetry} className="flex h-11 items-center justify-center gap-2 rounded-lg">
              <RotateCcw className="h-4 w-4" aria-hidden />
              إعادة المحاولة
            </Button>
          </div>

          <ReviewSummaryCards summary={summary} total={allItems.length} />
          <ReviewQuestionIndex items={items} activeIndex={safeIndex} onSelect={setIndex} />
        </CardHeader>
      </Card>

      <Card className="border bg-card/95 shadow-sm" dir={dir} lang={lang}>
        <CardHeader className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className={`text-lg font-semibold leading-tight sm:text-xl ${align}`}>
              {questionNumberLabel(current!.questionNumber, lang)}
            </h2>

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

        <CardContent className="space-y-5 p-5 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
          <div className={`prose max-w-none text-base leading-relaxed dark:prose-invert sm:prose-lg ${align}`}>
            <RichQuestionContent content={q.questionText} />
          </div>

          <ReviewAnswers item={current!} align={align} lang={lang} />

          {showExplanation ? (
            <div className="space-y-2">
              <div className={`inline-flex items-center gap-2 text-sm font-medium ${align}`}>
                <Info className="h-4 w-4" aria-hidden />
                التوضيح
              </div>
              <div className={`rounded-lg border bg-muted/30 p-4 ${align}`}>
                <RichQuestionContent content={explanation} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={safeIndex === 0}
          className="flex h-11 items-center justify-center gap-2 rounded-lg"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
          السابق
        </Button>
        <Button
          onClick={goNext}
          disabled={safeIndex === total - 1}
          className="flex h-11 items-center justify-center gap-2 rounded-lg"
        >
          التالي
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function ReviewSummaryCards({ summary, total }: { summary: ReviewSummary; total: number }) {
  const cards = [
    {
      label: "صحيحة",
      value: summary.correct,
      className: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200",
    },
    {
      label: "خاطئة",
      value: summary.wrong,
      className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200",
    },
    {
      label: "غير مجابة",
      value: summary.unanswered,
      className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/35 dark:text-slate-200",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label={`ملخص المراجعة من ${total} أسئلة`}>
      {cards.map((card) => (
        <div key={card.label} className={["rounded-lg border px-3 py-2 text-center", card.className].join(" ")}>
          <div className="text-lg font-bold leading-none sm:text-xl">{card.value}</div>
          <div className="mt-1 text-[11px] font-semibold sm:text-xs">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function ReviewQuestionIndex({
  items,
  activeIndex,
  onSelect,
}: {
  items: ReviewItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (items.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-muted-foreground">فهرس الأسئلة</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {items.map((item, itemIndex) => {
            const active = itemIndex === activeIndex;
            const stateClass = !item.isAnswered
              ? "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
              : item.isCorrect
                ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/25 dark:text-green-200"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200";

            return (
              <button
                key={item.question.id}
                type="button"
                onClick={() => onSelect(itemIndex)}
                aria-current={active ? "true" : undefined}
                aria-label={`السؤال ${item.questionNumber}`}
                className={[
                  "flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  stateClass,
                  active ? "ring-2 ring-primary/40" : "hover:bg-muted",
                ].join(" ")}
              >
                {item.questionNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewAnswers({ item, align, lang }: { item: ReviewItem; align: string; lang: TextLang }) {
  const q = item.question;

  if (q.options.length === 0) {
    return (
      <div className="space-y-2">
        <div className={`text-sm font-medium ${align}`}>إجابة الطالب</div>
        <div
          className={[
            "rounded-lg border p-4",
            align,
            item.isCorrect
              ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20",
          ].join(" ")}
        >
          {item.userText ? (
            <RichQuestionContent content={item.userText} />
          ) : (
            <span className="text-muted-foreground">لم يجب</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`text-sm font-medium ${align}`}>الخيارات</div>
      <div className="grid gap-3">
        {q.options.map((option) => (
          <ReviewOption
            key={option.id}
            isCorrectOption={option.isCorrect}
            isUserSelected={item.userChoiceId === option.id}
            userAnswerCorrect={item.isCorrect}
            align={align}
            displayText={reviewOptionText(q, option, lang)}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewOption({
  isCorrectOption,
  isUserSelected,
  userAnswerCorrect,
  align,
  displayText,
}: {
  isCorrectOption: boolean;
  isUserSelected: boolean;
  userAnswerCorrect: boolean;
  align: string;
  displayText: string;
}) {
  const stateClass = isCorrectOption
    ? "border-green-300 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-900/25 dark:text-green-50"
    : isUserSelected
      ? "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-900/25 dark:text-red-50"
      : "border-border bg-background text-foreground";

  const label = isCorrectOption && isUserSelected
    ? userAnswerCorrect
      ? "إجابتك الصحيحة"
      : "اختيارك والإجابة الصحيحة"
    : isCorrectOption
      ? "الإجابة الصحيحة"
      : isUserSelected
        ? "اختيارك"
        : null;

  return (
    <div className={["rounded-xl border p-4 transition-colors", stateClass].join(" ")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className={`min-w-0 flex-1 ${align}`}>
          <RichQuestionContent content={displayText} />
        </div>

        {label ? (
          <Badge
            variant="outline"
            className={[
              "w-fit shrink-0 rounded-full font-semibold",
              isCorrectOption
                ? "border-green-300 bg-white/70 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
                : "border-red-300 bg-white/70 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
            ].join(" ")}
          >
            {label}
          </Badge>
        ) : null}
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
        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">جميع الأسئلة</Badge>
      )}
    </div>
  );
}

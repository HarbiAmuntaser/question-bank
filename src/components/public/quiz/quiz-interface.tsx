// src/components/public/quiz/quiz-interface.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { QuizWithQuestions, QuizSession, QuizAnswer } from "@/types";

import { QuestionDisplay } from "./question-display";

import { useQuizRuntime } from "./use-quiz-runtime";
import { QuizHeader } from "./quiz-header";
import { QuizFooterControls } from "./quiz-footer-controls";
import { QuizMobileNav } from "./quiz-mobile-nav";
import { QuizNavigation } from "./quiz-navigation";

type GradeResponse = Record<string, unknown>;

type QuizSubmissionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  answeredQuestions: number;
  onConfirm: () => void;
};

type ResumeAttemptDialogProps = {
  open: boolean;
  quizTitle: string;
  resumeInfo: {
    answeredCount: number;
    totalQuestions: number;
    currentIndex: number;
    timeRemaining: number;
    startTime?: string;
  };
  onResume: () => void;
  onRestart: () => void;
};

const QuizSubmissionDialog = dynamic<QuizSubmissionDialogProps>(
  () => import("./quiz-submission-dialog").then((mod) => mod.QuizSubmissionDialog),
  { ssr: false, loading: () => <DialogLazyFallback /> },
);

const ResumeAttemptDialog = dynamic<ResumeAttemptDialogProps>(
  () => import("./resume-attempt-dialog").then((mod) => mod.ResumeAttemptDialog),
  { ssr: false, loading: () => <DialogLazyFallback /> },
);

function DialogLazyFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        جاري تحميل النافذة...
      </div>
    </div>
  );
}

function QuizLoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center px-4" aria-live="polite">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"
        role="status"
        aria-label="جاري تحميل الاختبار"
      >
        <span className="sr-only">جاري تحميل الاختبار</span>
      </div>
    </div>
  );
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function QuizInterface({ quiz }: { quiz: QuizWithQuestions }) {
  const router = useRouter();

  const {
    isReady,
    needsResumeChoice,
    resumeInfo,
    startNewAttempt,
    resumeAttempt,

    session,
    setSession,
    answers,
    setAnswer,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    timeRemaining,
    setTimeRemaining,
    currentQuestion,
    answeredCount,
    progress,
    cleanupActive,
    storeCompletedSession,
  } = useQuizRuntime(quiz);

  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmitQuiz = useCallback(async () => {
    if (!session || submittingRef.current) return;
    submittingRef.current = true;

    const endTime = new Date();

    const completedSession: QuizSession = {
      ...session,
      endTime,
      answers,
      isCompleted: true,
    };

    const durationSec =
      completedSession.startTime && completedSession.endTime
        ? Math.max(
            0,
            Math.floor(
              (new Date(completedSession.endTime).getTime() -
                new Date(completedSession.startTime).getTime()) /
                1000
            )
          )
        : 0;

    try {
      const res = await fetch("/api/v1/student/quizzes/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: completedSession.answers as Record<string, QuizAnswer>,
          timeSpent: durationSec,
        }),
      });

      let graded: GradeResponse | null = null;

      if (res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const payload =
          body && typeof body === "object" && "data" in (body as any)
            ? (body as { data: unknown }).data
            : body;

        if (payload && typeof payload === "object") graded = payload as GradeResponse;
      }

      // حفظ الجلسة + تنظيف
      storeCompletedSession(completedSession);
      cleanupActive();
      setSession(completedSession);

      // حفظ نتيجة التقييم (مرة واحدة فقط)
      if (graded) {
        const entry = {
          sessionId: completedSession.id,
          quizId: quiz.id,
          duration: durationSec,
          ...graded,
        };

        localStorage.setItem(`quiz_result_${completedSession.id}`, JSON.stringify(entry));

        const allResults = safeArray<Record<string, unknown>>(
          JSON.parse(localStorage.getItem("quiz_results") || "[]")
        );
        localStorage.setItem("quiz_results", JSON.stringify([...allResults, entry]));
      }

      router.push(`/quiz/${encodeURIComponent(quiz.id)}/results?session=${encodeURIComponent(completedSession.id)}`);
    } catch {
      // fallback محلي بدون تقييم من السيرفر
      storeCompletedSession(completedSession);
      cleanupActive();
      setSession(completedSession);
      router.push(`/quiz/${encodeURIComponent(quiz.id)}/results?session=${encodeURIComponent(completedSession.id)}`);
    } finally {
      submittingRef.current = false;
    }
  }, [answers, cleanupActive, quiz.id, router, session, setSession, storeCompletedSession]);

  const handleTimeUp = useCallback(() => {
    handleSubmitQuiz();
  }, [handleSubmitQuiz]);

  if (!isReady) {
    return <QuizLoadingState />;
  }

  if (needsResumeChoice && resumeInfo) {
    return (
      <ResumeAttemptDialog
        open
        quizTitle={quiz.title}
        resumeInfo={resumeInfo}
        onResume={resumeAttempt}
        onRestart={startNewAttempt}
      />
    );
  }

  if (!session) {
    return <QuizLoadingState />;
  }

  const total = quiz.questions.length;
  const isFirst = currentQuestionIndex === 0;
  const isLast = currentQuestionIndex === total - 1;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 pb-28 pt-4 sm:px-4 sm:pb-32 sm:pt-6 lg:space-y-6 lg:px-0 lg:py-6">
      <QuizHeader
        title={quiz.title}
        description={quiz.description}
        questionIndex={currentQuestionIndex + 1}
        totalQuestions={total}
        answeredCount={answeredCount}
        progress={progress}
        timeRemaining={timeRemaining}
        onTimeUp={handleTimeUp}
        onTimeUpdate={setTimeRemaining}
        onOpenSubmit={() => setShowSubmissionDialog(true)}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
        <div className="space-y-4">
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            answer={answers[currentQuestion.id]}
            onAnswerChange={(answer) => setAnswer(currentQuestion.id, answer)}
          />

          <QuizMobileNav
            questions={quiz.questions}
            answers={answers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionSelect={setCurrentQuestionIndex}
          />
        </div>

        <aside className="hidden lg:block">
          <QuizNavigation
            questions={quiz.questions}
            answers={answers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionSelect={setCurrentQuestionIndex}
          />
        </aside>
      </div>

      <div className="hidden lg:block">
        <QuizFooterControls
          isFirst={isFirst}
          isLast={isLast}
          onPrev={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          onNext={() => setCurrentQuestionIndex(Math.min(total - 1, currentQuestionIndex + 1))}
          onSubmit={() => setShowSubmissionDialog(true)}
        />
      </div>

      <div
        className="fixed left-3 right-3 z-40 lg:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto max-w-3xl">
          <QuizFooterControls
            isFirst={isFirst}
            isLast={isLast}
            onPrev={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            onNext={() => setCurrentQuestionIndex(Math.min(total - 1, currentQuestionIndex + 1))}
            onSubmit={() => setShowSubmissionDialog(true)}
            className="bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90"
          />
        </div>
      </div>

      {showSubmissionDialog ? (
        <QuizSubmissionDialog
          open={showSubmissionDialog}
          onOpenChange={setShowSubmissionDialog}
          totalQuestions={total}
          answeredQuestions={answeredCount}
          onConfirm={handleSubmitQuiz}
        />
      ) : null}
    </div>
  );
}

// src/components/public/quiz/quiz-interface.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { QuizWithQuestions, QuizSession, QuizAnswer } from "@/types";

import { QuestionDisplay } from "./question-display";
import { QuizSubmissionDialog } from "./quiz-submission-dialog";
import { ResumeAttemptDialog } from "./resume-attempt-dialog";

import { useQuizRuntime } from "./use-quiz-runtime";
import { QuizHeader } from "./quiz-header";
import { QuizFooterControls } from "./quiz-footer-controls";
import { QuizMobileNav } from "./quiz-mobile-nav";
import { QuizNavigation } from "./quiz-navigation";

type GradeResponse = Record<string, unknown>;

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">جاري تحضير الاختبار...</p>
        </div>
      </div>
    );
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">جاري تحضير الاختبار...</p>
        </div>
      </div>
    );
  }

  const total = quiz.questions.length;
  const isFirst = currentQuestionIndex === 0;
  const isLast = currentQuestionIndex === total - 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            answer={answers[currentQuestion.id]}
            onAnswerChange={(answer) => setAnswer(currentQuestion.id, answer)}
          />

          <div className="lg:hidden">
            <QuizFooterControls
              isFirst={isFirst}
              isLast={isLast}
              onPrev={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              onNext={() => setCurrentQuestionIndex(Math.min(total - 1, currentQuestionIndex + 1))}
              onSubmit={() => setShowSubmissionDialog(true)}
            />
          </div>

          <QuizMobileNav
            questions={quiz.questions}
            answers={answers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionSelect={setCurrentQuestionIndex}
          />
        </div>

        <div className="hidden lg:block lg:col-span-1">
          <QuizNavigation
            questions={quiz.questions}
            answers={answers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionSelect={setCurrentQuestionIndex}
          />
        </div>
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

      <QuizSubmissionDialog
        open={showSubmissionDialog}
        onOpenChange={setShowSubmissionDialog}
        totalQuestions={total}
        answeredQuestions={answeredCount}
        onConfirm={handleSubmitQuiz}
      />
    </div>
  );
}

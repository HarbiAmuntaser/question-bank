// src/components/public/quiz/result/quiz-results.tsx
"use client";

import type { QuizWithQuestions } from "@/types";
import { useQuizResults } from "./use-quiz-results";

import { ResultPrintStyles } from "./result-print-styles";
import { ResultSummaryCard } from "./result-summary-card";
import { ResultBestCard } from "./result-best-card";
import { ResultPerformanceCard } from "./result-performance-card";
import { ResultActions } from "./result-actions";
import { ResultLoading } from "./result-loading";
import { ResultStudyGuidance, type ResultStudySummaryReference } from "./result-study-guidance";

export function QuizResults({
  quiz,
  sessionId,
  backToSubjectUrl,
  studySummaries = [],
}: {
  quiz: QuizWithQuestions;
  sessionId: string;
  backToSubjectUrl?: string;
  studySummaries?: ResultStudySummaryReference[];
}) {
  const state = useQuizResults({ quiz, sessionId });

  if (state.loading) return <ResultLoading />;

  if (!state.current) return <ResultLoading label="تعذر تحميل النتيجة، حاول إعادة فتح الصفحة." />;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-4 sm:px-4 sm:py-6 lg:space-y-6 lg:px-0">
      <ResultPrintStyles />

      <ResultSummaryCard quizTitle={quiz.title} current={state.current} />

      <ResultBestCard attemptsCount={state.attemptsCount} best={state.best} isCurrentBest={state.isCurrentBest} />

      <ResultPerformanceCard current={state.current} />

      <ResultStudyGuidance
        quiz={quiz}
        current={state.current}
        completedAnswers={state.completedAnswers}
        summaries={studySummaries}
        reviewWrongHref={`/quiz/${encodeURIComponent(quiz.id)}/review?session=${encodeURIComponent(sessionId)}&onlyWrong=1`}
      />

      {/* ✅ تمرير sessionId لإظهار أزرار المراجعة */}
      <ResultActions
        quizId={quiz.id}
        sessionId={sessionId}
        backToSubjectUrl={backToSubjectUrl}
      />
    </div>
  );
}

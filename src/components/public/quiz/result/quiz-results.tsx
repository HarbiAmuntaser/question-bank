// src/components/public/quiz/result/quiz-results.tsx
"use client";

import type { QuizWithQuestions } from "@/types";
import { useQuizResults } from "./use-quiz-results";

import { ResultPrintStyles } from "./result-print-styles";
import { ResultSummaryCard } from "./result-summary-card";
import { ResultBestCard } from "./result-best-card";
import { ResultStatsCard } from "./result-stats-card";
import { ResultSessionCard } from "./result-session-card";
import { ResultPerformanceCard } from "./result-performance-card";
import { ResultActions } from "./result-actions";
import { ResultLoading } from "./result-loading";

export function QuizResults({
  quiz,
  sessionId,
  backToSubjectUrl,
}: {
  quiz: QuizWithQuestions;
  sessionId: string;
  backToSubjectUrl?: string;
}) {
  const state = useQuizResults({ quiz, sessionId });

  if (state.loading) return <ResultLoading />;

  if (!state.current) return <ResultLoading label="تعذر تحميل النتيجة، حاول إعادة فتح الصفحة." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ResultPrintStyles />

      <ResultSummaryCard quizTitle={quiz.title} current={state.current} />

      <ResultBestCard attemptsCount={state.attemptsCount} best={state.best} isCurrentBest={state.isCurrentBest} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResultStatsCard current={state.current} quizTimeLimitMin={quiz.timeLimit} />
        <ResultSessionCard current={state.current} quizTimeLimitMin={quiz.timeLimit} />
      </div>

      <ResultPerformanceCard current={state.current} />

      {/* ✅ تمرير sessionId لإظهار أزرار المراجعة */}
      <ResultActions
        quizId={quiz.id}
        sessionId={sessionId}
        backToSubjectUrl={backToSubjectUrl}
        shareText={state.shareText}
      />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";

type QuizShareProps = {
  url: string;
  title: string;
  text?: string;
};

const QuizShare = dynamic<QuizShareProps>(
  () => import("./quiz-share").then((mod) => mod.QuizShare),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col justify-center gap-2 sm:flex-row" aria-live="polite">
        <div className="h-11 w-full rounded-lg border bg-muted/30 sm:w-36" />
        <div className="h-11 w-full rounded-lg border bg-muted/30 sm:w-36" />
      </div>
    ),
  },
);

export function LazyQuizShare(props: QuizShareProps) {
  return <QuizShare {...props} />;
}

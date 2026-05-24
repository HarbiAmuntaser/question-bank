// src/components/public/quiz/storage.ts
"use client";

export const makeQuizKeys = (quizId: string) => ({
  answers: `quiz_answers_${quizId}`,
  session: `quiz_session_${quizId}`,
  active: `quiz_active_${quizId}`,
});

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// أنواع خفيفة لـ requestIdleCallback (لو غير متاحة في TS عندك)
type IdleDeadlineLike = { didTimeout: boolean; timeRemaining: () => number };
type IdleCallback = (deadline: IdleDeadlineLike) => void;

export function writeStorageIdle(fn: () => void) {
  if (typeof window === "undefined") return;

  const ric = (window as unknown as { requestIdleCallback?: (cb: IdleCallback, opts?: { timeout?: number }) => number })
    .requestIdleCallback;

  if (ric) return ric(() => fn(), { timeout: 700 });

  return window.setTimeout(fn, 0);
}

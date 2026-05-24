// src/components/public/quiz/result/use-quiz-results.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuizWithQuestions, QuizAnswer } from "@/types";
import { makeQuizKeys, safeJsonParse } from "../storage";

type StoredCompleted = {
  id: string;
  quizId: string;
  startTime: string; // ISO
  answers: Record<string, QuizAnswer>;
  currentIndex?: number;
  timeRemaining?: number; // seconds
  isCompleted: boolean;
};

export type UiResult = {
  quizId: string;
  sessionId: string;
  correctAnswers: number;
  totalQuestions: number;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  grade: string;
  completedAtISO: string;
  durationSec: number;
};

function gradeLabel(p: number) {
  if (p >= 90) return "ممتاز";
  if (p >= 80) return "جيد جداً";
  if (p >= 70) return "جيد";
  if (p >= 60) return "مقبول";
  return "راسب";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeAnyResult(x: any): UiResult | null {
  if (!x || typeof x !== "object") return null;
  const quizId = String(x.quizId || "");
  const sessionId = String(x.sessionId || x.session || x.id || "");
  const totalQuestions = Number(x.totalQuestions ?? 0);
  const correctAnswers = Number(x.correctAnswers ?? 0);
  const earnedPoints = Number(x.earnedPoints ?? 0);
  const totalPoints = Number(x.totalPoints ?? 0);
  const percentage = Number(x.percentage ?? 0);
  const grade = String(x.grade || gradeLabel(percentage));
  const completedAtISO = String(x.completedAt || x.completedAtISO || new Date().toISOString());
  const durationSec = Number(x.duration ?? x.durationSec ?? 0);

  if (!quizId || !sessionId || !Number.isFinite(totalQuestions)) return null;

  return {
    quizId,
    sessionId,
    totalQuestions: Math.max(0, totalQuestions),
    correctAnswers: Math.max(0, correctAnswers),
    earnedPoints: Math.max(0, earnedPoints),
    totalPoints: Math.max(0, totalPoints),
    percentage: clamp(percentage, 0, 100),
    grade,
    completedAtISO,
    durationSec: Math.max(0, durationSec),
  };
}

function calculateLocalResult(session: StoredCompleted, quiz: QuizWithQuestions): UiResult {
  let correct = 0;
  let earned = 0;

  for (const q of quiz.questions) {
    const a = session.answers?.[q.id];
    if (!a) continue;

    let isCorrect = false;

    if (q.questionType === "multiple_choice") {
      const correctOpt = q.options?.find((o: any) => o.isCorrect);
      isCorrect = a.selectedOptionIds?.[0] === correctOpt?.id;
    } else if (q.questionType === "true_false") {
      const correctOpt = q.options?.find((o: any) => o.isCorrect);
      const correctVal =
        String(correctOpt?.optionText).toLowerCase() === "true" || correctOpt?.optionText === "صحيح";
      isCorrect = a.booleanAnswer === correctVal;
    } else if (q.questionType === "short_answer" || q.questionType === "essay") {
      isCorrect = !!a.textAnswer && a.textAnswer.trim().length > 0;
    }

    if (isCorrect) {
      correct++;
      earned += Number(q.points || 0);
    }
  }

  const totalQuestions = quiz.questions.length;
  const percentage = totalQuestions ? (correct / totalQuestions) * 100 : 0;

  const timeSpent = (() => {
    const limit = Math.max(0, quiz.timeLimit * 60);
    const remaining = typeof session.timeRemaining === "number" ? Math.max(0, session.timeRemaining) : 0;
    return clamp(limit - remaining, 0, limit);
  })();

  return {
    quizId: quiz.id,
    sessionId: session.id,
    correctAnswers: correct,
    totalQuestions,
    earnedPoints: earned,
    totalPoints: Number(quiz.totalPoints || 0),
    percentage,
    grade: gradeLabel(percentage),
    completedAtISO: new Date().toISOString(),
    durationSec: timeSpent,
  };
}

function pickBest(list: UiResult[]) {
  if (!list.length) return null;
  return list
    .slice()
    .sort((a, b) => {
      // الأفضل: نسبة أعلى، ثم نقاط أعلى، ثم الأحدث
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.earnedPoints !== a.earnedPoints) return b.earnedPoints - a.earnedPoints;
      return new Date(b.completedAtISO).getTime() - new Date(a.completedAtISO).getTime();
    })[0];
}

export function useQuizResults({ quiz, sessionId }: { quiz: QuizWithQuestions; sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<UiResult | null>(null);
  const [best, setBest] = useState<UiResult | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);

  useEffect(() => {
    setLoading(true);

    const keys = makeQuizKeys(quiz.id);

    // 1) اقرأ نتيجة السيرفر لهذه الجلسة (إن وجدت)
    const graded = safeJsonParse<any>(localStorage.getItem("quiz_result_" + sessionId));
    const gradedNorm = normalizeAnyResult(graded);

    // 2) اقرأ session المحفوظ للاختبار (آخر محاولة) — قد لا يطابق sessionId دائمًا
    const storedSession = safeJsonParse<StoredCompleted>(localStorage.getItem(keys.session));

    // 3) إن لم توجد نتيجة سيرفر، احسب محلياً (fallback) بشرط وجود session
    const fallback =
      !gradedNorm && storedSession && storedSession.quizId === quiz.id && storedSession.isCompleted === true
        ? calculateLocalResult(storedSession, quiz)
        : null;

    const finalCurrent = gradedNorm || fallback;

    // 4) اقرأ كل المحاولات واحسب الأفضل
    const all = safeJsonParse<any[]>(localStorage.getItem("quiz_results")) || [];
    const forThisQuiz = all
      .map((x) => normalizeAnyResult(x))
      .filter((x): x is UiResult => Boolean(x && x.quizId === quiz.id));

    // لو ما تم حفظ هذه النتيجة ضمن القائمة العامة (أول مرة)، أضفها
    if (finalCurrent) {
      const exists = forThisQuiz.some((r) => r.sessionId === finalCurrent.sessionId);
      if (!exists) {
        const next = [...all, finalCurrent];
        localStorage.setItem("quiz_results", JSON.stringify(next));
        forThisQuiz.push(finalCurrent);
      }
    }

    const bestPick = pickBest(forThisQuiz);

    setCurrent(finalCurrent);
    setBest(bestPick);
    setAttemptsCount(forThisQuiz.length);

    setLoading(false);
  }, [quiz, sessionId]);

  const isCurrentBest = useMemo(() => {
    if (!current || !best) return false;
    return current.sessionId === best.sessionId;
  }, [current, best]);

  const shareText = useMemo(() => {
    if (!current) return `نتيجتي في اختبار ${quiz.title}`;
    return `نتيجتي في اختبار "${quiz.title}": ${Math.round(current.percentage)}% (${current.grade})`;
  }, [current, quiz.title]);

  return { loading, current, best, attemptsCount, isCurrentBest, shareText };
}

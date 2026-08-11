// src/components/public/quiz/use-quiz-runtime.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizWithQuestions, QuizAnswer, QuizSession } from "@/types";
import { makeQuizKeys, safeJsonParse, writeStorageIdle } from "./storage";

/**
 * هذا الـ Hook مسؤول عن:
 * - إنشاء/استئناف جلسة الاختبار
 * - حفظ إجابات المستخدم + الوقت + المؤشر بشكل “خفيف”
 * - تحذير beforeunload
 * - ✅ ميزة احترافية: إذا وجدنا محاولة غير مكتملة، لا نُكمل تلقائيًا،
 *   بل نطلب قرار المستخدم: (متابعة) أو (بدء محاولة جديدة)
 */

type ActivePayload = {
  id: string;
  quizId: string;
  startTime: string; // ISO
  answers: Record<string, QuizAnswer>;
  currentIndex: number;
  timeRemaining: number;
  isCompleted: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isValidActivePayload(x: any, quizId: string): x is ActivePayload {
  return (
    x &&
    typeof x === "object" &&
    x.quizId === quizId &&
    typeof x.id === "string" &&
    typeof x.startTime === "string" &&
    typeof x.timeRemaining === "number" &&
    typeof x.currentIndex === "number" &&
    typeof x.isCompleted === "boolean" &&
    x.answers &&
    typeof x.answers === "object"
  );
}

export function useQuizRuntime(quiz: QuizWithQuestions) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [session, setSession] = useState<QuizSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit * 60);

  // ✅ قرار الاستئناف
  const [resumeCandidate, setResumeCandidate] = useState<ActivePayload | null>(null);

  // ✅ جاهزية التحضير (بدل الاعتماد على session فقط)
  const [isReady, setIsReady] = useState(false);

  // لمنع الحفظ المتكرر بشكل زائد
  const saveTimerRef = useRef<number | null>(null);

  // 1) تهيئة/استئناف أو انتظار قرار المستخدم
  useEffect(() => {
    setIsReady(false);

    const keys = makeQuizKeys(quiz.id);

    const activeRaw = safeJsonParse<any>(localStorage.getItem(keys.active));
    const savedRaw = safeJsonParse<any>(localStorage.getItem(keys.session));
    const active = isValidActivePayload(activeRaw, quiz.id) ? (activeRaw as ActivePayload) : null;
    const saved = isValidActivePayload(savedRaw, quiz.id) ? (savedRaw as ActivePayload) : null;

    // ✅ لو عندنا Session مكتملة قديمة، نظف أي بقايا (answers/active) حتى لا يفتح الاختبار "محلول"
    if (saved?.quizId === quiz.id && saved.isCompleted === true) {
      localStorage.removeItem(keys.active);
      localStorage.removeItem(keys.answers);
    }

    // ✅ إذا توجد محاولة غير مكتملة (active) → نطلب قرار المستخدم
    if (active && active.isCompleted !== true) {
      setResumeCandidate(active);
      setSession(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setTimeRemaining(quiz.timeLimit * 60);
      setIsReady(true);
      return;
    }

    // خلاف ذلك: إما saved غير مكتمل (نستأنف مباشرة) أو لا يوجد شيء (نبدأ جديد)
    const freshId = `quiz_${quiz.id}_${Date.now()}`;
    const nowISO = new Date().toISOString();

    const source =
      saved && saved.quizId === quiz.id && saved.isCompleted !== true
        ? saved
        : null;

    let initialIndex = 0;
    let initialAnswers: Record<string, QuizAnswer> = {};
    let initialTime = quiz.timeLimit * 60;

    const initialSession: QuizSession = {
      id: source?.id || freshId,
      quizId: quiz.id,
      startTime: source?.startTime ? new Date(source.startTime) : new Date(nowISO),
      answers: {},
      isCompleted: false,
    };

    if (source) {
      initialAnswers = source.answers || {};
      initialIndex = Number.isFinite(source.currentIndex) ? source.currentIndex : 0;
      initialTime = typeof source.timeRemaining === "number" ? source.timeRemaining : initialTime;
    } else {
      // fallback: answers فقط (قديمة) — لكن نستخدمها فقط إذا لم توجد جلسة مكتملة
      const answersOnly = safeJsonParse<Record<string, QuizAnswer>>(localStorage.getItem(keys.answers));
      if (answersOnly) initialAnswers = answersOnly;
    }

    const safeIndex = clamp(initialIndex, 0, Math.max(0, quiz.questions.length - 1));

    setSession(initialSession);
    setAnswers(initialAnswers);
    setCurrentQuestionIndex(safeIndex);
    setTimeRemaining(Math.max(0, initialTime));
    setResumeCandidate(null);

    // خزّن active للاستئناف لاحقًا
    const payload: ActivePayload = {
      id: initialSession.id,
      quizId: quiz.id,
      startTime: initialSession.startTime.toISOString(),
      answers: initialAnswers,
      currentIndex: safeIndex,
      timeRemaining: Math.max(0, initialTime),
      isCompleted: false,
    };
    localStorage.setItem(keys.active, JSON.stringify(payload));

    setIsReady(true);
  }, [quiz.id, quiz.timeLimit, quiz.questions.length]);

  // 2) تحذير عند الإغلاق (فقط إذا في جلسة فعلًا)
  useEffect(() => {
    if (!session) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (!session?.isCompleted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [session]);

  // 3) حفظ تلقائي (debounced + idle) — لا يعمل قبل اختيار المستخدم
  useEffect(() => {
    if (!session) return;
    if (resumeCandidate) return; // ✅ أثناء انتظار القرار لا نحفظ شيء

    const keys = makeQuizKeys(quiz.id);

    const payload: ActivePayload = {
      id: session.id,
      quizId: quiz.id,
      startTime: session.startTime instanceof Date ? session.startTime.toISOString() : new Date().toISOString(),
      answers,
      currentIndex: currentQuestionIndex,
      timeRemaining,
      isCompleted: false,
    };

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      writeStorageIdle(() => {
        localStorage.setItem(keys.active, JSON.stringify(payload));
        localStorage.setItem(keys.answers, JSON.stringify(answers));
      });
    }, 250);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [session, resumeCandidate, answers, currentQuestionIndex, timeRemaining, quiz.id]);

  // ✅ معلومات مختصرة للـ Dialog
  const resumeInfo = useMemo(() => {
    if (!resumeCandidate) return null;
    const total = quiz.questions.length || 1;
    const answeredCount = Object.keys(resumeCandidate.answers || {}).length;
    const safeIndex = clamp(resumeCandidate.currentIndex ?? 0, 0, total - 1);
    const safeTime =
      typeof resumeCandidate.timeRemaining === "number"
        ? Math.max(0, resumeCandidate.timeRemaining)
        : quiz.timeLimit * 60;

    return {
      answeredCount,
      totalQuestions: total,
      currentIndex: safeIndex,
      timeRemaining: safeTime,
      startTime: resumeCandidate.startTime,
    };
  }, [resumeCandidate, quiz.questions.length, quiz.timeLimit]);

  // مشتقات (Memo) للجلسة الحالية
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const progress = useMemo(() => {
    const total = quiz.questions.length || 0;
    return total ? (answeredCount / total) * 100 : 0;
  }, [answeredCount, quiz.questions.length]);

  const currentQuestion = useMemo(() => {
    const safeIndex = clamp(currentQuestionIndex, 0, Math.max(0, quiz.questions.length - 1));
    return quiz.questions[safeIndex];
  }, [quiz.questions, quiz.questions.length, currentQuestionIndex]);

  const setAnswer = useCallback((questionId: string, answer: QuizAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const cleanupActive = useCallback(() => {
    const keys = makeQuizKeys(quiz.id);
    localStorage.removeItem(keys.answers);
    localStorage.removeItem(keys.active);
  }, [quiz.id]);

  const storeCompletedSession = useCallback(
    (completedSession: QuizSession) => {
      const keys = makeQuizKeys(quiz.id);
      const payload = {
        id: completedSession.id,
        quizId: quiz.id,
        startTime: completedSession.startTime instanceof Date ? completedSession.startTime.toISOString() : new Date().toISOString(),
        answers: completedSession.answers,
        currentIndex: currentQuestionIndex,
        timeRemaining,
        isCompleted: true,
      };

      localStorage.setItem(keys.session, JSON.stringify(payload));
      localStorage.setItem(`quiz_session_${quiz.id}_${completedSession.id}`, JSON.stringify(payload));
      localStorage.setItem(`quiz_session_${completedSession.id}`, JSON.stringify(payload));
    },
    [quiz.id, currentQuestionIndex, timeRemaining]
  );

  // ✅ بدء محاولة جديدة (يمسح active/answers فقط، ولا يمسح سجل النتائج لاحقًا)
  const startNewAttempt = useCallback(() => {
    const keys = makeQuizKeys(quiz.id);

    // نظف أي بقايا قد تجعل الاختبار يظهر "محلول"
    localStorage.removeItem(keys.active);
    localStorage.removeItem(keys.answers);

    const freshId = `quiz_${quiz.id}_${Date.now()}`;
    const s: QuizSession = {
      id: freshId,
      quizId: quiz.id,
      startTime: new Date(),
      answers: {},
      isCompleted: false,
    };

    setSession(s);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeRemaining(quiz.timeLimit * 60);
    setResumeCandidate(null);

    // خزّن active جديد
    const payload: ActivePayload = {
      id: s.id,
      quizId: quiz.id,
      startTime: s.startTime.toISOString(),
      answers: {},
      currentIndex: 0,
      timeRemaining: quiz.timeLimit * 60,
      isCompleted: false,
    };
    localStorage.setItem(keys.active, JSON.stringify(payload));
  }, [quiz.id, quiz.timeLimit]);

  // ✅ متابعة المحاولة غير المكتملة
  const resumeAttempt = useCallback(() => {
    if (!resumeCandidate) return;

    const total = quiz.questions.length || 1;
    const safeIndex = clamp(resumeCandidate.currentIndex ?? 0, 0, total - 1);
    const safeTime =
      typeof resumeCandidate.timeRemaining === "number"
        ? Math.max(0, resumeCandidate.timeRemaining)
        : quiz.timeLimit * 60;

    const s: QuizSession = {
      id: resumeCandidate.id || `quiz_${quiz.id}_${Date.now()}`,
      quizId: quiz.id,
      startTime: resumeCandidate.startTime ? new Date(resumeCandidate.startTime) : new Date(),
      answers: {},
      isCompleted: false,
    };

    setSession(s);
    setAnswers(resumeCandidate.answers || {});
    setCurrentQuestionIndex(safeIndex);
    setTimeRemaining(safeTime);
    setResumeCandidate(null);

    // تأكيد أن active محفوظ
    const keys = makeQuizKeys(quiz.id);
    localStorage.setItem(
      keys.active,
      JSON.stringify({
        ...resumeCandidate,
        currentIndex: safeIndex,
        timeRemaining: safeTime,
        isCompleted: false,
      })
    );
  }, [resumeCandidate, quiz.id, quiz.timeLimit, quiz.questions.length]);

  return {
    // state
    isReady,
    session,
    setSession,
    answers,
    setAnswers,
    setAnswer,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    timeRemaining,
    setTimeRemaining,
    currentQuestion,
    answeredCount,
    progress,

    // resume-choice state
    needsResumeChoice: Boolean(resumeCandidate),
    resumeInfo,
    startNewAttempt,
    resumeAttempt,

    // existing helpers
    cleanupActive,
    storeCompletedSession,
  };
}

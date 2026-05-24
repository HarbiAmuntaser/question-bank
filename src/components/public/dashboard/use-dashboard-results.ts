// src/components/public/dashboard/use-dashboard-results.ts
"use client";

/**
 * هذا الـ hook مسؤول عن:
 * - قراءة quiz_results من localStorage
 * - تنظيف/تطبيع البيانات
 * - حساب الإحصائيات بشكل memo (بدون setState إضافي)
 * - الاستماع لتغيّر localStorage من تبويبات أخرى (storage event)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuizResult } from "@/types";
import { safeJsonParse } from "@/components/public/quiz/storage";
import { dayKey, toDate } from "./dashboard-utils";

const STORAGE_KEY = "quiz_results";
const MAX_RESULTS = 5000; // حماية من التضخم

function normalizeResults(raw: unknown): QuizResult[] {
  if (!Array.isArray(raw)) return [];

  const cleaned = raw
    .filter(Boolean)
    .map((r: any) => {
      // minimal fields we rely on
      return {
        sessionId: String(r.sessionId ?? ""),
        quizId: String(r.quizId ?? ""),
        correctAnswers: Number(r.correctAnswers ?? 0),
        totalQuestions: Number(r.totalQuestions ?? 0),
        earnedPoints: Number(r.earnedPoints ?? 0),
        totalPoints: Number(r.totalPoints ?? 0),
        percentage: Number(r.percentage ?? 0),
        duration: Number(r.duration ?? 0),
        grade: String(r.grade ?? "راسب"),
        completedAt: r.completedAt ?? new Date().toISOString(),
      } as QuizResult;
    })
    .filter((r: QuizResult) => r.sessionId && r.quizId);

  // sort by completedAt asc then trim
  cleaned.sort((a, b) => {
    const da = toDate(a.completedAt)?.getTime() ?? 0;
    const db = toDate(b.completedAt)?.getTime() ?? 0;
    return da - db;
  });

  return cleaned.slice(-MAX_RESULTS);
}

function computeStreak(results: QuizResult[]) {
  if (!results.length) return 0;

  const days = new Set<string>();
  for (const r of results) {
    const d = toDate(r.completedAt);
    if (d) days.add(dayKey(d));
  }

  // نبدأ من اليوم للخلف
  const today = dayKey(new Date());
  let streak = 0;

  for (;;) {
    const check = new Date();
    check.setDate(check.getDate() - streak);
    const k = dayKey(check);

    if (days.has(k)) streak++;
    else break;

    // حماية
    if (streak > 3650) break;
  }

  // لو اليوم غير موجود، streak = 0 طبيعي
  if (!days.has(today)) return 0;
  return streak;
}

export function useDashboardResults() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const parsed = safeJsonParse<any>(localStorage.getItem(STORAGE_KEY));
    const normalized = normalizeResults(parsed);
    setResults(normalized);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();

    // تحديث عند تغيّر localStorage من تبويب آخر
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const stats = useMemo(() => {
    if (!results.length) {
      return {
        totalQuizzes: 0,
        averageScore: 0,
        totalTime: 0,
        bestScore: 0,
        streak: 0,
      };
    }

    const totalQuizzes = results.length;
    const sum = results.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
    const totalTime = results.reduce((s, r) => s + (Number(r.duration) || 0), 0);
    const bestScore = Math.max(...results.map((r) => Number(r.percentage) || 0));
    const averageScore = sum / totalQuizzes;

    return {
      totalQuizzes,
      averageScore: Math.round(averageScore),
      totalTime,
      bestScore: Math.round(bestScore),
      streak: computeStreak(results),
    };
  }, [results]);

  const recentResults = useMemo(() => {
    // آخر 5 (الأحدث أولاً)
    const copy = results.slice(-5);
    copy.sort((a, b) => (toDate(b.completedAt)?.getTime() ?? 0) - (toDate(a.completedAt)?.getTime() ?? 0));
    return copy;
  }, [results]);

  const historyDesc = useMemo(() => {
    // نسخة مرتبة تنازلياً بدون reverse() الذي يخرّب state
    const copy = results.slice();
    copy.sort((a, b) => (toDate(b.completedAt)?.getTime() ?? 0) - (toDate(a.completedAt)?.getTime() ?? 0));
    return copy;
  }, [results]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setResults([]);
  }, []);

  const exportAll = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      count: results.length,
      results,
    };
    return payload;
  }, [results]);

  return {
    loaded,
    results,
    stats,
    recentResults,
    historyDesc,
    refresh,
    clearAll,
    exportAll,
  };
}

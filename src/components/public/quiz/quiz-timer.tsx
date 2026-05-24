"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";

interface QuizTimerProps {
  initialTime: number; // seconds (قيمة بدء/استئناف)
  onTimeUp: () => void;
  onTimeUpdate: (timeRemaining: number) => void; // لحفظ التقدم في الـ runtime
}

/**
 * Timer داخلي لعرض الثواني بسلاسة،
 * مع تقليل تحديثات الأب (performance) والحفظ (localStorage).
 */
export function QuizTimer({ initialTime, onTimeUp, onTimeUpdate }: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => Math.max(0, Math.floor(initialTime)));

  const intervalRef = useRef<number | null>(null);
  const endAtRef = useRef<number>(Date.now() + Math.max(0, Math.floor(initialTime)) * 1000);
  const firedUpRef = useRef(false);

  // لمنع إعادة الضبط كل ثانية: نعيد الضبط فقط إذا كانت قيمة initialTime مختلفة "بشكل واضح"
  const lastExternalRef = useRef<number>(Math.max(0, Math.floor(initialTime)));

  useEffect(() => {
    const nextExternal = Math.max(0, Math.floor(initialTime));

    // إذا زاد الوقت أو اختلف كثيرًا، نعتبره استئناف/ضبط حقيقي
    const shouldReset =
      nextExternal > lastExternalRef.current + 1 || Math.abs(nextExternal - timeRemaining) > 2;

    if (shouldReset) {
      lastExternalRef.current = nextExternal;
      firedUpRef.current = false;
      setTimeRemaining(nextExternal);
      endAtRef.current = Date.now() + nextExternal * 1000;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTime]);

  // عدّاد مع تصحيح drift
  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      const msLeft = endAtRef.current - Date.now();
      const next = Math.max(0, Math.ceil(msLeft / 1000));

      setTimeRemaining((prev) => {
        if (prev === next) return prev;

        // ✅ تحديث الأب بحكمة:
        // - كل 5 ثواني لتخفيف الرندر + الحفظ
        // - وفي آخر دقيقة: كل ثانية (للدقة)
        // - وعند الصفر
        const shouldNotify =
          next === 0 || next <= 60 || next % 5 === 0;

        if (shouldNotify) {
          // لا نريد ربط setState متداخل؛ نسلمه للأب async
          queueMicrotask(() => onTimeUpdate(next));
        }

        // time up مرة واحدة
        if (next === 0 && !firedUpRef.current) {
          firedUpRef.current = true;
          queueMicrotask(() => onTimeUp());
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [onTimeUp, onTimeUpdate]);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const { colorClass, bgClass } = useMemo(() => {
    const c =
      timeRemaining <= 300
        ? "text-red-600 dark:text-red-400"
        : timeRemaining <= 600
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-green-600 dark:text-green-400";

    const b =
      timeRemaining <= 300
        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        : timeRemaining <= 600
        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
        : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";

    return { colorClass: c, bgClass: b };
  }, [timeRemaining]);

  // إعلان مساعد عند العتبات (مرة واحدة)
  const lastAnnouncedRef = useRef<number | null>(null);
  const srMessage =
    timeRemaining <= 10
      ? "بقي أقل من 10 ثوانٍ."
      : timeRemaining <= 60
      ? "بقي أقل من دقيقة."
      : timeRemaining <= 300
      ? "بقي أقل من خمس دقائق."
      : "";

  const shouldAnnounce =
    (timeRemaining === 300 && lastAnnouncedRef.current !== 300) ||
    (timeRemaining === 60 && lastAnnouncedRef.current !== 60) ||
    (timeRemaining === 10 && lastAnnouncedRef.current !== 10);

  useEffect(() => {
    if (shouldAnnounce) {
      lastAnnouncedRef.current = timeRemaining;
    }
  }, [shouldAnnounce, timeRemaining]);

  return (
    <Card className={`${bgClass} transition-colors duration-300`} role="timer" aria-live="polite">
      <CardContent className="p-4">
        {shouldAnnounce && srMessage ? (
          <div aria-live="assertive" className="sr-only">
            {srMessage}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {timeRemaining <= 300 ? (
              <AlertTriangle className={`h-5 w-5 ${colorClass}`} aria-hidden />
            ) : (
              <Clock className={`h-5 w-5 ${colorClass}`} aria-hidden />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الوقت المتبقي</span>
          </div>

          <div className={`text-2xl font-bold tabular-nums ${colorClass}`} aria-label={`الوقت المتبقي ${formatTime(timeRemaining)}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {timeRemaining <= 600 ? (
          <div className="mt-2" aria-hidden>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-1000 ${
                  timeRemaining <= 300 ? "bg-red-500" : "bg-yellow-500"
                }`}
                style={{ width: `${Math.min(100, (timeRemaining / 600) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

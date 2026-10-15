"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, PauseCircle } from "lucide-react";

import { Switch } from "@/components/ui/switch";

interface QuizTimerProps {
  initialTime: number;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onTimeUp: () => void;
  onTimeUpdate: (timeRemaining: number) => void;
}

export function QuizTimer({
  initialTime,
  enabled,
  onEnabledChange,
  onTimeUp,
  onTimeUpdate,
}: QuizTimerProps) {
  const normalizedInitialTime = Math.max(0, Math.floor(initialTime));
  const [timeRemaining, setTimeRemaining] = useState(normalizedInitialTime);

  const intervalRef = useRef<number | null>(null);
  const endAtRef = useRef(Date.now() + normalizedInitialTime * 1000);
  const remainingRef = useRef(normalizedInitialTime);
  const firedUpRef = useRef(false);
  const lastExternalRef = useRef(normalizedInitialTime);
  const onTimeUpRef = useRef(onTimeUp);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    const nextExternal = Math.max(0, Math.floor(initialTime));
    const shouldReset =
      nextExternal > lastExternalRef.current + 1 ||
      Math.abs(nextExternal - remainingRef.current) > 2;

    if (!shouldReset) return;

    lastExternalRef.current = nextExternal;
    remainingRef.current = nextExternal;
    firedUpRef.current = false;
    setTimeRemaining(nextExternal);
    if (enabled) endAtRef.current = Date.now() + nextExternal * 1000;
  }, [enabled, initialTime]);

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (!enabled || remainingRef.current <= 0) return;

    endAtRef.current = Date.now() + remainingRef.current * 1000;
    intervalRef.current = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));

      setTimeRemaining((previous) => {
        if (previous === next) return previous;

        remainingRef.current = next;
        const shouldNotify = next === 0 || next <= 60 || next % 5 === 0;
        if (shouldNotify) queueMicrotask(() => onTimeUpdateRef.current(next));

        if (next === 0 && !firedUpRef.current) {
          firedUpRef.current = true;
          queueMicrotask(() => onTimeUpRef.current());
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [enabled]);

  const handleEnabledChange = (nextEnabled: boolean) => {
    if (!nextEnabled) onTimeUpdateRef.current(remainingRef.current);
    onEnabledChange(nextEnabled);
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const { colorClass, bgClass } = useMemo(() => {
    if (!enabled) {
      return {
        colorClass: "text-muted-foreground",
        bgClass: "border-border bg-muted/40",
      };
    }

    return {
      colorClass:
        timeRemaining <= 300
          ? "text-red-600 dark:text-red-400"
          : timeRemaining <= 600
            ? "text-yellow-600 dark:text-yellow-400"
            : "text-green-600 dark:text-green-400",
      bgClass:
        timeRemaining <= 300
          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          : timeRemaining <= 600
            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
            : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
    };
  }, [enabled, timeRemaining]);

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
    enabled &&
    ((timeRemaining === 300 && lastAnnouncedRef.current !== 300) ||
      (timeRemaining === 60 && lastAnnouncedRef.current !== 60) ||
      (timeRemaining === 10 && lastAnnouncedRef.current !== 10));

  useEffect(() => {
    if (shouldAnnounce) lastAnnouncedRef.current = timeRemaining;
  }, [shouldAnnounce, timeRemaining]);

  return (
    <div className={`${bgClass} w-full rounded-lg border p-3 transition-colors duration-300 sm:w-auto sm:min-w-64 sm:px-4`}>
      {shouldAnnounce && srMessage ? (
        <div aria-live="assertive" className="sr-only">
          {srMessage}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {enabled ? (
            timeRemaining <= 300 ? (
              <AlertTriangle className={`h-5 w-5 shrink-0 ${colorClass}`} aria-hidden />
            ) : (
              <Clock className={`h-5 w-5 shrink-0 ${colorClass}`} aria-hidden />
            )
          ) : (
            <PauseCircle className={`h-5 w-5 shrink-0 ${colorClass}`} aria-hidden />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground/75">
              {enabled ? "الوقت المتبقي" : "المؤقت متوقف"}
            </div>
            {enabled ? (
              <div
                className={`text-xl font-bold tabular-nums ${colorClass}`}
                role="timer"
                aria-live="polite"
                aria-label={`الوقت المتبقي ${formatTime(timeRemaining)}`}
              >
                {formatTime(timeRemaining)}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">لن يتم التسليم تلقائيًا</div>
            )}
          </div>
        </div>

        <Switch
          id="quiz-timer-toggle"
          checked={enabled}
          disabled={timeRemaining <= 0}
          onCheckedChange={handleEnabledChange}
          aria-label={enabled ? "إيقاف مؤقت الاختبار" : "تفعيل مؤقت الاختبار"}
        />
      </div>

      {enabled && timeRemaining <= 600 ? (
        <div className="mt-2" aria-hidden>
          <div className="h-1 w-full rounded-full bg-muted">
            <div
              className={`h-1 rounded-full transition-all duration-1000 ${
                timeRemaining <= 300 ? "bg-red-500" : "bg-yellow-500"
              }`}
              style={{ width: `${Math.min(100, (timeRemaining / 600) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

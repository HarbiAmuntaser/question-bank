
import type React from "react";
import {
  CheckCircle2,
  Clock3,
  FileQuestion,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type { HeroPreviewCardProps } from "./types";

export function HeroPreviewCard({ preview }: HeroPreviewCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-teal-400/20 via-emerald-400/10 to-cyan-400/20 blur-2xl dark:from-teal-500/15 dark:via-emerald-500/10 dark:to-cyan-500/15"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-teal-100/80 bg-card/95 p-4 shadow-xl shadow-teal-950/10 ring-1 ring-white/70 backdrop-blur dark:border-teal-900/50 dark:bg-slate-950/85 dark:shadow-black/30 dark:ring-white/10 sm:p-5">
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-teal-400/80 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-teal-300/15 blur-3xl dark:bg-teal-500/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10"
          aria-hidden
        />

        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 dark:border-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                {preview.badge}
              </span>

              <h3 className="mt-3 text-2xl font-extrabold leading-snug text-foreground">
                {preview.title}
              </h3>

              <p className="mt-1 max-w-xs text-sm font-medium leading-6 text-foreground/70">
                {preview.description}
              </p>
            </div>

            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-cyan-600 text-white shadow-lg shadow-teal-950/15 dark:from-teal-500 dark:to-cyan-500">
              <FileQuestion className="h-7 w-7" aria-hidden />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <PreviewMetric
              icon={<FileQuestion className="h-4 w-4" aria-hidden />}
              label="الأسئلة"
              value={preview.questions}
            />
            <PreviewMetric
              icon={<Clock3 className="h-4 w-4" aria-hidden />}
              label="الوقت"
              value={preview.duration}
            />
            <PreviewMetric
              icon={<Gauge className="h-4 w-4" aria-hidden />}
              label="المستوى"
              value={preview.level}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/90 via-background to-cyan-50/70 p-4 dark:border-teal-900/60 dark:from-teal-950/35 dark:via-slate-950/80 dark:to-cyan-950/25">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground/65">
                  {preview.scoreLabel}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-4xl font-black leading-none text-teal-700 dark:text-teal-300">
                    {preview.scoreValue}
                  </p>
                  <span className="pb-1 text-xs font-bold text-foreground/50">
                    مؤشر مبدئي
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                جاهز
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-background shadow-inner ring-1 ring-border">
              <div
                className="h-full rounded-full bg-gradient-to-l from-teal-700 via-emerald-500 to-cyan-500"
                style={{ width: `${preview.progressValue}%` }}
                aria-hidden
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-foreground/65">
              <span>{preview.progressLabel}</span>
              <span dir="ltr">{preview.progressValue}%</span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-3.5 text-sm font-semibold leading-6 text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-100">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span>{preview.successNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/80 p-3 text-center shadow-sm transition-colors dark:bg-slate-950/50">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
        {icon}
      </div>
      <p className="text-[11px] font-bold text-foreground/55">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-foreground">{value}</p>
    </div>
  );
}


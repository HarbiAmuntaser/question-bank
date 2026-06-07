import type React from "react";
import { CheckCircle2, Clock3, FileQuestion, Gauge, ShieldCheck } from "lucide-react";

import type { HeroPreviewCardProps } from "./types";

export function HeroPreviewCard({ preview }: HeroPreviewCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-2xl border bg-card p-4 shadow-sm dark:bg-slate-950/70 sm:p-5">
      <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-l from-transparent via-teal-400/70 to-transparent" aria-hidden />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 dark:border-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
            {preview.badge}
          </span>
          <h3 className="mt-3 text-xl font-extrabold leading-snug text-foreground">
            {preview.title}
          </h3>
          <p className="mt-1 text-sm font-medium leading-6 text-foreground/70">
            {preview.description}
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
          <FileQuestion className="h-6 w-6" aria-hidden />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <PreviewMetric icon={<FileQuestion className="h-4 w-4" aria-hidden />} label="الأسئلة" value={preview.questions} />
        <PreviewMetric icon={<Clock3 className="h-4 w-4" aria-hidden />} label="الوقت" value={preview.duration} />
        <PreviewMetric icon={<Gauge className="h-4 w-4" aria-hidden />} label="المستوى" value={preview.level} />
      </div>

      <div className="mt-5 rounded-xl border bg-muted/25 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-foreground/65">{preview.scoreLabel}</p>
            <p className="mt-1 text-3xl font-extrabold leading-none text-teal-700 dark:text-teal-300">
              {preview.scoreValue}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            جاهز
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-background ring-1 ring-border">
          <div
            className="h-full rounded-full bg-gradient-to-l from-teal-600 to-cyan-500"
            style={{ width: `${preview.progressValue}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-foreground/65">
          <span>{preview.progressLabel}</span>
          <span dir="ltr">{preview.progressValue}%</span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-teal-50/70 p-3 text-sm font-medium leading-6 text-teal-900 dark:bg-teal-950/30 dark:text-teal-100">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span>{preview.successNote}</span>
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
    <div className="rounded-xl border bg-background p-3 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
        {icon}
      </div>
      <p className="text-[11px] font-bold text-foreground/60">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-foreground">{value}</p>
    </div>
  );
}


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
        className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-primary/20 via-[hsl(var(--brand-emerald)_/_0.10)] to-[hsl(var(--brand-cyan)_/_0.20)] blur-2xl dark:from-primary/15 dark:via-[hsl(var(--brand-emerald)_/_0.10)] dark:to-[hsl(var(--brand-cyan)_/_0.15)]"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-card/95 p-4 shadow-xl shadow-primary/10 ring-1 ring-white/70 backdrop-blur dark:border-primary/30 dark:bg-slate-950/85 dark:shadow-black/30 dark:ring-white/10 sm:p-5">
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-primary/80 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-[hsl(var(--brand-cyan)_/_0.15)] blur-3xl dark:bg-[hsl(var(--brand-cyan)_/_0.10)]"
          aria-hidden
        />

        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary dark:border-primary/35 dark:bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand-amber))]" aria-hidden />
                {preview.badge}
              </span>

              <h3 className="mt-3 text-2xl font-extrabold leading-snug text-foreground">
                {preview.title}
              </h3>

              <p className="mt-1 max-w-xs text-sm font-medium leading-6 text-foreground/70">
                {preview.description}
              </p>
            </div>

            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-lg shadow-primary/15">
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

          <div className="mt-5 rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--brand-teal)_/_0.08),hsl(var(--background)),hsl(var(--brand-cyan)_/_0.08))] p-4 dark:border-primary/30 dark:bg-[linear-gradient(135deg,hsl(var(--brand-teal)_/_0.18),hsl(var(--background)),hsl(var(--brand-cyan)_/_0.12))]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground/65">
                  {preview.scoreLabel}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-4xl font-black leading-none text-primary">
                    {preview.scoreValue}
                  </p>
                  <span className="pb-1 text-xs font-bold text-foreground/50">
                    مؤشر مبدئي
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--brand-emerald)_/_0.22)] bg-[hsl(var(--brand-emerald)_/_0.08)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--brand-emerald))] dark:border-[hsl(var(--brand-emerald)_/_0.35)] dark:bg-[hsl(var(--brand-emerald)_/_0.14)]">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                جاهز
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-background shadow-inner ring-1 ring-border">
              <div
                className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                style={{ width: `${preview.progressValue}%` }}
                aria-hidden
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-foreground/65">
              <span>{preview.progressLabel}</span>
              <span dir="ltr">{preview.progressValue}%</span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-3.5 text-sm font-semibold leading-6 text-foreground dark:border-primary/30 dark:bg-primary/10">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-slate-900">
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
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-primary dark:bg-primary/10">
        {icon}
      </div>
      <p className="text-[11px] font-bold text-foreground/55">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-foreground">{value}</p>
    </div>
  );
}

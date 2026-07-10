import Link from "next/link";
import { ArrowLeft, BookOpenCheck, GraduationCap, School } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { HeroActionsProps } from "./types";

export function HeroActions({
  typeLabel,
  primaryHref,
  secondaryHref,
  tertiaryHref,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
}: HeroActionsProps) {
  const resolvedPrimaryLabel =
    primaryLabel || `استعراض ${typeLabel || "المؤسسات"}`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
      <Button
        asChild
        size="lg"
        className="h-12 rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(var(--primary-hover))] sm:h-12 lg:w-auto lg:px-7"
      >
        <Link href={primaryHref} prefetch={false} className="flex w-full items-center justify-center gap-2">
          <BookOpenCheck className="h-5 w-5" aria-hidden />
          {resolvedPrimaryLabel}
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </Button>

      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 rounded-lg border-primary/20 bg-background/80 px-5 text-base font-bold text-foreground shadow-sm hover:border-primary/35 hover:bg-primary/5 dark:border-primary/35 dark:bg-background/70 dark:hover:bg-primary/10 lg:w-auto lg:px-6"
      >
        <Link href={secondaryHref} prefetch={false} className="flex w-full items-center justify-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
          {secondaryLabel}
        </Link>
      </Button>

      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 rounded-lg border-slate-200 bg-background/80 px-5 text-base font-bold text-foreground shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-background/70 dark:hover:bg-slate-900 sm:col-span-2 lg:col-span-1 lg:w-auto lg:px-6"
      >
        <Link href={tertiaryHref} prefetch={false} className="flex w-full items-center justify-center gap-2">
          <School className="h-5 w-5 text-slate-700 dark:text-slate-300" aria-hidden />
          {tertiaryLabel}
        </Link>
      </Button>
    </div>
  );
}

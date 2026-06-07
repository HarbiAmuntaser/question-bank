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
        className="h-12 rounded-lg bg-teal-700 px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-teal-800 sm:h-12 lg:w-auto lg:px-7"
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
        className="h-12 rounded-lg border-teal-200 bg-background/80 px-5 text-base font-bold text-foreground shadow-sm hover:border-teal-300 hover:bg-teal-50 dark:border-teal-900/70 dark:bg-background/70 dark:hover:bg-teal-950/30 lg:w-auto lg:px-6"
      >
        <Link href={secondaryHref} prefetch={false} className="flex w-full items-center justify-center gap-2">
          <GraduationCap className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden />
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

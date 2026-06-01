import Image from "next/image";
import { BookOpenCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type PublicLoadingStateProps = {
  title?: string;
  description?: string;
  imageSrc?: string;
  cards?: number;
  variant?: "cards" | "quiz";
  className?: string;
};

export function PublicLoadingState({
  title = "جاري تجهيز المحتوى التعليمي...",
  description = "نرتب البيانات لتظهر لك بشكل واضح ومنظم.",
  imageSrc = "/images/institutions/default.svg",
  cards = 3,
  variant = "cards",
  className,
}: PublicLoadingStateProps) {
  return (
    <section
      className={cn("py-10", className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      dir="rtl"
    >
      <div className="mx-auto max-w-5xl rounded-lg border bg-card/95 p-5 text-center shadow-sm dark:bg-gray-900/80 sm:p-6">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted/30">
          <Image
            src={imageSrc}
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-cover opacity-90"
            priority={false}
          />
        </div>

        <div className="mx-auto max-w-xl space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
            <h2 className="text-lg font-semibold leading-tight sm:text-xl">{title}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        </div>

        {variant === "quiz" ? <QuizLoadingSkeleton /> : <CardsLoadingSkeleton cards={cards} />}
      </div>
    </section>
  );
}

function CardsLoadingSkeleton({ cards }: { cards: number }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-background/70 p-4 text-right">
          <div className="mb-4 h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

function QuizLoadingSkeleton() {
  return (
    <div className="mx-auto mt-6 max-w-2xl space-y-3 rounded-lg border bg-background/70 p-4" aria-hidden>
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

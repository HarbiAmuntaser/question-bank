import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type PublicLoadingStateProps = {
  title?: string;
  description?: string;
  imageSrc?: string;
  cards?: number;
  variant?: "cards" | "quiz";
  className?: string;
};

export function PublicLoadingState({ title = "جاري تحميل المحتوى...", description, className }: PublicLoadingStateProps) {
  return (
    <div
      className={cn("flex min-h-[50vh] items-center justify-center py-10", className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="max-w-md text-center">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm leading-relaxed text-foreground/70">{description}</p> : null}
      </div>
    </div>
  );
}

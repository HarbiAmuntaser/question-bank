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

export function PublicLoadingState({ className }: PublicLoadingStateProps) {
  return (
    <div
      className={cn("flex min-h-[50vh] items-center justify-center py-10", className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
      <span className="sr-only">جاري التحميل</span>
    </div>
  );
}

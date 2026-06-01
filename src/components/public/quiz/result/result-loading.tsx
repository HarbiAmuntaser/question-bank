"use client";

import { PublicLoadingState } from "@/components/public/public-loading-state";

export function ResultLoading({ label = "جاري تحليل النتائج..." }: { label?: string }) {
  return (
    <PublicLoadingState
      title={label}
      description="نراجع إجاباتك ونجهز ملخص الأداء."
      variant="quiz"
      className="py-4"
    />
  );
}

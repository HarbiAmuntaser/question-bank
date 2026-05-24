// src/components/public/quiz/result/result-loading.tsx
"use client";

export function ResultLoading({ label = "جاري تحليل النتائج..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[420px]">
      <div className="text-center" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

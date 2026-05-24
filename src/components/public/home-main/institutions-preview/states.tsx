// file: src/components/public/home-main/institutions-preview/states.tsx

import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function PreviewLoading() {
  return (
    <div className="flex items-center justify-center py-12 sm:py-14">
      <LoadingSpinner />
    </div>
  );
}

export function PreviewError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl p-5 sm:p-6 border bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
      {message}
    </div>
  );
}

export function PreviewEmpty() {
  return (
    <div className="text-center py-10 text-muted-foreground">
      لا توجد بيانات حالياً لهذا القسم.
    </div>
  );
}

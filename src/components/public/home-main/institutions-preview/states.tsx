// file: src/components/public/home-main/institutions-preview/states.tsx

export function PreviewLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          // Skeleton mirrors the final card footprint to reduce CLS while client data loads.
          className="overflow-hidden rounded-lg border-2 bg-white/90 shadow-md dark:bg-gray-800/90"
        >
          <div className="h-36 animate-pulse bg-muted sm:h-44" />
          <div className="space-y-4 p-6">
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted sm:h-12" />
          </div>
        </div>
      ))}
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

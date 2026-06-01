// file: src/components/public/university-grid/states.tsx

import { Search } from "lucide-react";

export function GridLoading() {
  return (
    <section className="py-14" role="status" aria-busy="true">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8 lg:px-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            // Keep loading cards the same size as real cards to avoid layout shift.
            className="overflow-hidden rounded-lg border bg-card/95 shadow-sm dark:bg-gray-900/80"
          >
            <div className="h-44 animate-pulse bg-muted sm:h-48" />
            <div className="space-y-5 p-6">
              <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-muted sm:h-12" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GridError({ message }: { message: string }) {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-3xl rounded-lg border border-red-200/60 bg-red-50 p-6 text-center dark:border-red-800/50 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-300 font-medium">{message}</p>
      </div>
    </section>
  );
}

export function GridEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto max-w-md rounded-lg border bg-card/95 p-6 shadow-sm">
        <Search className="mx-auto mb-4 h-14 w-14 text-muted-foreground" aria-hidden />
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

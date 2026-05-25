// file: src/components/public/university-grid/states.tsx

import { Search } from "lucide-react";

export function GridLoading() {
  return (
    <section className="py-14" role="status" aria-busy="true">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 lg:gap-8 lg:px-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            // Keep loading cards the same size as real cards to avoid layout shift.
            className="overflow-hidden rounded-lg border-2 bg-white/90 shadow-lg dark:bg-gray-800/90"
          >
            <div className="h-44 animate-pulse bg-muted sm:h-48" />
            <div className="space-y-5 p-6">
              <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-muted sm:h-12" />
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
      <div className="max-w-3xl mx-auto text-center rounded-2xl p-6 bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/50">
        <p className="text-red-700 dark:text-red-300 font-medium">{message}</p>
      </div>
    </section>
  );
}

export function GridEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="text-center py-14">
      <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-2xl max-w-md mx-auto">
        <Search className="h-14 w-14 text-gray-400 mx-auto mb-4" aria-hidden />
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{text}</p>
      </div>
    </div>
  );
}

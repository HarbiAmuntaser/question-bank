// file: src/components/public/university-grid/states.tsx

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Search } from "lucide-react";

export function GridLoading() {
  return (
    <section className="py-14">
      <div className="flex items-center justify-center py-16" role="status" aria-busy="true">
        <LoadingSpinner />
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

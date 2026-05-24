// file: src/components/public/university-grid/grid-header.tsx

import { GraduationCap } from "lucide-react";

export function GridHeader({ heading, subheading }: { heading: string; subheading: string }) {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-400 rounded-2xl shadow-lg" aria-hidden>
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
          {heading}
        </h2>
      </div>

      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
        {subheading}
      </p>
    </div>
  );
}

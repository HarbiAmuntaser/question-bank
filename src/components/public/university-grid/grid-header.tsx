// file: src/components/public/university-grid/grid-header.tsx

import { MapPin } from "lucide-react";

export function GridHeader({ heading, subheading }: { heading: string; subheading: string }) {
  return (
    <div className="mb-8 text-center sm:mb-10">
      <div className="mb-3 flex items-center justify-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3 text-primary" aria-hidden>
          <MapPin className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl lg:text-4xl">
          {heading}
        </h2>
      </div>

      <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {subheading}
      </p>
    </div>
  );
}

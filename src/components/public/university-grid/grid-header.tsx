// file: src/components/public/university-grid/grid-header.tsx

import { Landmark, Route, School } from "lucide-react";
import type { InstType } from "./types";

export function GridHeader({ heading, subheading, type }: { heading: string; subheading: string; type: InstType }) {
  const Icon = type === "academy" ? Route : type === "school" ? School : Landmark;

  return (
    <div className="mb-8 text-center sm:mb-10">
      <div className="mb-3 flex items-center justify-center gap-3">
        <div className="rounded-lg bg-primary/10 p-3 text-primary" aria-hidden>
          <Icon className="h-7 w-7" />
        </div>
        <h1 id="institutions-heading" className="text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
          {heading}
        </h1>
      </div>

      <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {subheading}
      </p>
    </div>
  );
}

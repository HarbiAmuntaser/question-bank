"use client";

import { Globe2 } from "lucide-react";
import { SUPPORTED_COUNTRIES, type CountryCode } from "@/config/regions";

type Props = {
  cc: CountryCode;
  onChange: (cc: CountryCode) => void;
  compact?: boolean;
};

export function CountrySwitcher({ cc, onChange, compact = false }: Props) {
  const countries = Object.entries(SUPPORTED_COUNTRIES) as Array<
    [CountryCode, { label: string }]
  >;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
        <select
          className="h-10 min-w-0 rounded-lg border bg-background px-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="اختيار الدولة"
          value={cc}
          onChange={(e) => onChange(e.target.value as CountryCode)}
        >
          {countries.map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.label} ({code})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border bg-background/80 pe-1 ps-2">
      <Globe2 className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
      <select
        className="h-9 bg-transparent text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="اختيار الدولة"
        value={cc}
        onChange={(e) => onChange(e.target.value as CountryCode)}
      >
        {countries.map(([code, meta]) => (
          <option key={code} value={code}>
            {meta.label} ({code})
          </option>
        ))}
      </select>
    </div>
  );
}

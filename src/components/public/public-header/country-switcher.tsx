// file: src/components/public/public-header/country-switcher.tsx
/**
 * Country Switcher
 * ----------------
 * مبدّل الدولة (Desktop + Mobile)
 * - compact للجوال
 */

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
        <Globe2 className="h-4 w-4" aria-hidden />
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
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
    <div className="flex items-center gap-2 ps-2 pe-1 py-1 rounded-md border">
      <Globe2 className="h-4 w-4" aria-hidden />
      <select
        className="h-8 bg-transparent text-sm outline-none"
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

// file: src/components/public/university-grid/search-bar.tsx

"use client";

import { memo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
};

export const UniversitySearchBar = memo(function UniversitySearchBar({
  value,
  onChange,
  label,
  placeholder,
}: Props) {
  return (
    <form
      role="search"
      aria-label={label}
      className="mx-auto mb-8 max-w-2xl sm:mb-10"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:h-5 sm:w-5" aria-hidden />
        <label htmlFor="universities-search" className="sr-only">
          {label}
        </label>

        <Input
          id="universities-search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-lg border bg-card/95 pr-11 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-primary/35 sm:h-12 sm:pr-12"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </form>
  );
});

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
      className="max-w-2xl mx-auto mb-8 sm:mb-10"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <label htmlFor="universities-search" className="sr-only">
          {label}
        </label>

        <Input
          id="universities-search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 sm:h-14 pr-12 text-base sm:text-lg border-2 border-gray-200 dark:border-gray-700 focus:border-primary rounded-2xl shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </form>
  );
});

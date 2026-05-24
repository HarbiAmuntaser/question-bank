// file: src/components/public/university-grid/use-debounced-value.ts

"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

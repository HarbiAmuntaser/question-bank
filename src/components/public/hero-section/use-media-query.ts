// file: src/components/public/hero-section/use-media-query.ts
"use client";

/**
 * useMediaQuery
 * -------------
 * Hook خفيف لمعرفة إن كانت الشاشة تطابق media query.
 * نستخدمه لتخفيف الأنيميشن على الجوال/الآيباد.
 */

import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);

    // ضبط أولي
    onChange();

    // متوافق مع المتصفحات الحديثة
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

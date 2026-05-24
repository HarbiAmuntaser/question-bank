// file: src/components/public/public-header/brand.tsx
/**
 * Brand / Logo
 * ------------
 * شعار الهيدر: يقود دائمًا للصفحة الرئيسية للدولة الحالية.
 */

import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Brand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      // ملاحظة: أبقيت prefetch كما هو للشعار فقط
      prefetch
      aria-label="الانتقال إلى الصفحة الرئيسية"
      className="flex items-center gap-2"
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        aria-hidden
      >
        <GraduationCap className="h-5 w-5" />
      </span>

      <span className="font-bold text-xl">بنك الأسئلة</span>
    </Link>
  );
}

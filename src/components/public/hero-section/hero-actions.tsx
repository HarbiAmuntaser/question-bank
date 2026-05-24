// file: src/components/public/hero-section/hero-actions.tsx
/**
 * Hero Actions
 * ------------
 * أزرار الـ CTA الأساسية داخل الهيرو.
 * - تم حذف زر البحث نهائياً حسب طلبك.
 * - تم تعديل نص الزر الثاني إلى: "استعرض الاختبارات الأكاديمية"
 */

// file: src/components/public/hero-section/hero-actions.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/content/hero";
import { BookOpen, GraduationCap, School } from "lucide-react";

type Props = {
  lang: Lang;
  typeLabel: string;

  primaryHref: string;
  secondaryHref: string;
  tertiaryHref: string;

  secondaryLabel: string; // من hero.ts
  tertiaryLabel: string;  // ✅ من hero.ts
};

export function HeroActions({
  lang,
  typeLabel,
  primaryHref,
  secondaryHref,
  tertiaryHref,
  secondaryLabel,
  tertiaryLabel,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 justify-center lg:justify-start">
      <Button
        asChild
        size="lg"
        className="h-14 px-8 text-lg rounded-xl shadow-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
      >
        <Link href={primaryHref} prefetch={false} className="flex items-center gap-3">
          <BookOpen className="h-6 w-6" aria-hidden />
          {lang === "ar" ? `استعراض ${typeLabel}` : `Browse ${typeLabel}`}
        </Link>
      </Button>

      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-14 px-8 text-lg rounded-xl shadow-lg border-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Link href={secondaryHref} prefetch={false} className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6" aria-hidden />
          {secondaryLabel}
        </Link>
      </Button>

      {/* ✅ NEW: زر الاختبارات المدرسية */}
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-14 px-8 text-lg rounded-xl shadow-lg border-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Link href={tertiaryHref} prefetch={false} className="flex items-center gap-3">
          <School className="h-6 w-6" aria-hidden />
          {tertiaryLabel}
        </Link>
      </Button>
    </div>
  );
}

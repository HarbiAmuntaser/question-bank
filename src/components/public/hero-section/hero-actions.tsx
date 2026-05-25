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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:flex lg:flex-row lg:flex-wrap lg:justify-start">
      <Button
        asChild
        size="lg"
        className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-base shadow-lg hover:from-blue-700 hover:to-cyan-600 lg:h-14 lg:w-auto lg:px-8 lg:text-lg"
      >
        <Link href={primaryHref} prefetch={false} className="flex w-full items-center justify-center gap-3">
          <BookOpen className="h-6 w-6" aria-hidden />
          {lang === "ar" ? `استعراض ${typeLabel}` : `Browse ${typeLabel}`}
        </Link>
      </Button>

      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 w-full rounded-xl border-2 bg-white/80 px-5 text-base shadow-lg backdrop-blur-sm hover:bg-gray-50 dark:bg-gray-800/80 dark:hover:bg-gray-700 lg:h-14 lg:w-auto lg:px-8 lg:text-lg"
      >
        <Link href={secondaryHref} prefetch={false} className="flex w-full items-center justify-center gap-3">
          <GraduationCap className="h-6 w-6" aria-hidden />
          {secondaryLabel}
        </Link>
      </Button>

      {/* ✅ NEW: زر الاختبارات المدرسية */}
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-12 w-full rounded-xl border-2 bg-white/80 px-5 text-base shadow-lg backdrop-blur-sm hover:bg-gray-50 dark:bg-gray-800/80 dark:hover:bg-gray-700 sm:col-span-2 lg:col-span-1 lg:h-14 lg:w-auto lg:px-8 lg:text-lg"
      >
        <Link href={tertiaryHref} prefetch={false} className="flex w-full items-center justify-center gap-3">
          <School className="h-6 w-6" aria-hidden />
          {tertiaryLabel}
        </Link>
      </Button>
    </div>
  );
}

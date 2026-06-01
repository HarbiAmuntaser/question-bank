// file: src/components/public/hero-section/hero-section.tsx
"use client";

/**
 * HeroSection (Refactor)
 * ----------------------
 * ✅ ما تم تنفيذه حسب طلبك:
 * - تقسيم الهيرو إلى عدة ملفات داخل مجلد لسهولة الصيانة.
 * - إضافة تعليقات توضّح المسؤوليات لكل جزء.
 * - حذف البحث بالكامل (Input + state + submit + أيقونات البحث).
 * - تعديل زر "استكشاف الاختبارات" إلى "استعرض الاختبارات الأكاديمية".
 * - تعديل الروابط لتطابق نمط الهيدر: /{cc}/{...}
 *
 * ✅ تحسينات أداء:
 * - إيقاف السلايدر عند عدم ظهور التبويب (visibilitychange).
 * - احترام reduce motion.
 * - Image priority فقط للشريحة الأولى لتقليل ضغط LCP.
 * - تعطيل prefetch في أزرار CTA لتقليل طلبات الشبكة (مفيد لPagespeed).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "./use-media-query";


import {
  HERO_I18N,
  COUNTRY_LABELS,
  TYPE_LABELS,
  type Lang,
  type InstitutionType,
  type HeroCopy,
} from "@/content/hero";

import { ICON_MAP } from "./icon-map";
import { HeroMedia } from "./hero-media";
import { HeroActions } from "./hero-actions";
import { formatBadge, getDocumentLang, normalizeCc, buildHeroLinks } from "./utils";
import type { HeroSectionProps } from "./types";

import { Star } from "lucide-react";

type HeroBackgroundProps = { animate: boolean };
type FeaturesGridProps = { copy: HeroCopy; allowMotion?: boolean };

const LazyHeroBackground = dynamic<HeroBackgroundProps>(
  () => import("./background").then((mod) => mod.HeroBackground),
  {
    ssr: false,
    loading: () => <StaticHeroBackground />,
  },
);

const LazyFeaturesGrid = dynamic<FeaturesGridProps>(
  () => import("./features-grid").then((mod) => mod.FeaturesGrid),
  {
    ssr: false,
    loading: () => <FeaturesGridFallback />,
  },
);

function StaticHeroBackground() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[url('/patterns/islamic-pattern.svg')] opacity-5" />
    </div>
  );
}

function FeaturesGridFallback() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:mt-20 lg:gap-8" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[220px] rounded-xl border-2 bg-white/60 shadow-sm backdrop-blur-sm dark:bg-gray-800/60"
        >
          <div className="flex h-full flex-col items-center p-5 text-center sm:p-6 lg:p-8">
            <div className="mb-6 h-16 w-16 rounded-2xl bg-muted/70" />
            <div className="mb-4 h-6 w-2/3 rounded bg-muted/70" />
            <div className="h-4 w-full rounded bg-muted/70" />
            <div className="mt-2 h-4 w-4/5 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeroSection({
  cc: rawCc = "SA",
  type = "university",
  lang: rawLang,
  
}: HeroSectionProps) {
  const cc = normalizeCc(rawCc);
  const [lang, setLang] = useState<Lang>(rawLang ?? "ar");


  // إن لم تُمرّر lang صراحة، نقرأها من <html lang>
  useEffect(() => {
    if (!rawLang) setLang(getDocumentLang());
  }, [rawLang]);

  const copy = useMemo(() => {
    const byLang = HERO_I18N[lang] ?? HERO_I18N.ar;
    return byLang[cc as "SA" | "YE"] || byLang.default;
  }, [lang, cc]);

  const countryLabel = COUNTRY_LABELS[cc]?.[lang] ?? cc;
  const typeLabel = TYPE_LABELS[type]?.[lang] ?? type;

  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const reduceMotion = useReducedMotion();
  const intervalRef = useRef<number | null>(null);
  // جوال + آيباد: أقل من 1024px
const isSmallScreen = useMediaQuery("(max-width: 1024px)");

// ✅ نعتبر “أنيميشن ثقيل” فقط للديسكتوب
const allowHeavyMotion = !reduceMotion && !isSmallScreen;
const [decorationsReady, setDecorationsReady] = useState(false);

// Defer decorative hero chunks so the LCP image and primary copy get priority.
useEffect(() => {
  const timer = window.setTimeout(() => setDecorationsReady(true), 350);
  return () => window.clearTimeout(timer);
}, []);
  // تحسين أداء: نوقف الحركة لو المستخدم بدّل التبويب
  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // تبديل الشرائح تلقائياً
useEffect(() => {
  if (paused || reduceMotion) return;

  // ✅ على الجوال/الآيباد نطوّل زمن التبديل لتقليل الحمل
  const delay = isSmallScreen ? 6500 : 4000;

  intervalRef.current = window.setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % copy.slides.length);
  }, delay);

  return () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  };
}, [paused, reduceMotion, isSmallScreen, copy.slides.length]);


  const slide = copy.slides[currentSlide];
  const SlideIcon = ICON_MAP[slide.icon] ?? ICON_MAP.graduation;

  // ✅ روابط متوافقة مع الهيدر
const { browseTypeHref, browseAcademiesHref, browseSchoolsHref } = buildHeroLinks(cc, type);

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 sm:py-10 lg:min-h-[86vh] lg:py-0"
      aria-label={lang === "ar" ? "القسم التعريفي الرئيسي" : "Hero section"}
    >
{decorationsReady ? <LazyHeroBackground animate={allowHeavyMotion} /> : <StaticHeroBackground />}

      <div
        className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* جانب النص */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -50 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 text-center lg:space-y-8 lg:text-right"
          >
            {/* شارة أعلى */}
            {!reduceMotion && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge
                  variant="secondary"
                  className="mb-6 text-sm px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-green-200 dark:border-green-800 shadow-lg"
                >
                  <Star className="w-4 h-4 ml-2 text-yellow-500" aria-hidden />
                  {formatBadge(copy.badgeTemplate, countryLabel)}
                </Badge>
              </motion.div>
            )}

            {/* عنوان/وصف حسب الشريحة */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                // Stable height keeps the hero from jumping when slide copy changes.
                className="min-h-[210px] space-y-3 sm:min-h-[220px] sm:space-y-4 lg:min-h-[300px]"
                aria-live="polite"
              >
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-6xl xl:text-7xl">
                  <span className={`bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent`}>
                    {slide.title}
                  </span>
                </h1>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 sm:text-2xl lg:text-3xl">
                  {slide.subtitle}
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg lg:mx-0 lg:text-xl">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ✅ الأزرار بعد حذف البحث */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
            

<HeroActions
  lang={lang}
  typeLabel={typeLabel}
  primaryHref={browseTypeHref}
  secondaryHref={browseAcademiesHref}
  tertiaryHref={browseSchoolsHref}
  secondaryLabel={copy.ctaSecondaryLabel}
  tertiaryLabel={copy.ctaTertiaryLabel}
/>        </motion.div>

            {/* مؤشرات الشرائح */}
            {!reduceMotion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center lg:justify-start gap-3 pt-4"
                aria-label="مؤشرات الشرائح"
              >
                {copy.slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={(lang === "ar" ? "انتقال إلى الشريحة رقم " : "Go to slide ") + (index + 1)}
                    aria-current={index === currentSlide ? "true" : "false"}
                    className={[
                      "w-3 h-3 rounded-full transition-all duration-300",
                      index === currentSlide
                        ? `bg-gradient-to-r ${slide.gradient} shadow-lg`
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500",
                    ].join(" ")}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* جانب الصورة */}
       <HeroMedia
  slide={slide}
  currentSlide={currentSlide}
  reduceMotion={!!reduceMotion}
  SlideIcon={SlideIcon}
  lang={lang}
  isSmallScreen={isSmallScreen}
/>

        </div>

        {/* بطاقات المزايا */}
{decorationsReady ? (
  <LazyFeaturesGrid copy={copy} allowMotion={!isSmallScreen} />
) : (
  <FeaturesGridFallback />
)}
      </div>
    </section>
  );
}

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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "./use-media-query";


import {
  HERO_I18N,
  COUNTRY_LABELS,
  TYPE_LABELS,
  type Lang,
  type InstitutionType,
} from "@/content/hero";

import { ICON_MAP } from "./icon-map";
import { HeroBackground } from "./background";
import { FeaturesGrid } from "./features-grid";
import { HeroMedia } from "./hero-media";
import { HeroActions } from "./hero-actions";
import { formatBadge, getDocumentLang, normalizeCc, buildHeroLinks } from "./utils";
import type { HeroSectionProps } from "./types";

import { Star } from "lucide-react";

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
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
      aria-label={lang === "ar" ? "القسم التعريفي الرئيسي" : "Hero section"}
    >
<HeroBackground animate={allowHeavyMotion} />

      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* جانب النص */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -50 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-right space-y-8"
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
                className="space-y-4"
                aria-live="polite"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                  <span className={`bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent`}>
                    {slide.title}
                  </span>
                </h1>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-700 dark:text-gray-300">
                  {slide.subtitle}
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
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
<FeaturesGrid copy={copy} allowMotion={!isSmallScreen} />
      </div>
    </section>
  );
}

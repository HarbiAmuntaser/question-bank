// file: src/components/public/hero-section/hero-section.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  COUNTRY_LABELS,
  HERO_I18N,
  TYPE_LABELS,
  type HeroCopy,
  type Lang,
} from "@/content/hero";

import { HeroActions } from "./hero-actions";
import type { HeroSectionProps } from "./types";
import {
  buildHeroLinks,
  formatBadge,
  getDocumentLang,
  normalizeCc,
} from "./utils";
import { useMediaQuery } from "./use-media-query";

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
    <div
      className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:mt-12 lg:gap-8"
      aria-hidden
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[200px] rounded-xl border-2 bg-white/60 shadow-sm backdrop-blur-sm dark:bg-gray-800/60"
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

  useEffect(() => {
    if (!rawLang) setLang(getDocumentLang());
  }, [rawLang]);

  const copy = useMemo(() => {
    const byLang = HERO_I18N[lang] ?? HERO_I18N.ar;
    return byLang[cc as "SA" | "YE"] || byLang.default;
  }, [lang, cc]);

  const countryLabel = COUNTRY_LABELS[cc]?.[lang] ?? cc;
  const typeLabel = TYPE_LABELS[type]?.[lang] ?? type;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const intervalRef = useRef<number | null>(null);
  const isSmallScreen = useMediaQuery("(max-width: 1024px)");
  const allowHeavyMotion = !reduceMotion && !isSmallScreen;
  const [decorationsReady, setDecorationsReady] = useState(false);

  // Defer decorative chunks so the primary hero copy gets render priority.
  useEffect(() => {
    const timer = window.setTimeout(() => setDecorationsReady(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () =>
      setPaused(document.visibilityState !== "visible");

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;

    const delay = isSmallScreen ? 6500 : 4000;
    intervalRef.current = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % copy.slides.length);
    }, delay);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [copy.slides.length, isSmallScreen, paused, reduceMotion]);

  const slide = copy.slides[currentSlide];
  const { browseAcademiesHref, browseSchoolsHref, browseTypeHref } =
    buildHeroLinks(cc, type);

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 py-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 sm:py-10 lg:min-h-[78vh] lg:py-12"
      aria-label={lang === "ar" ? "القسم التعريفي الرئيسي" : "Hero section"}
    >
      {decorationsReady ? (
        <LazyHeroBackground animate={allowHeavyMotion} />
      ) : (
        <StaticHeroBackground />
      )}

      <div
        className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="mx-auto max-w-5xl text-center">
          {!reduceMotion && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge
                variant="secondary"
                className="mb-5 rounded-full border-green-200 bg-gradient-to-r from-green-100 to-emerald-100 px-5 py-2 text-xs shadow-md dark:border-green-800 dark:from-green-900 dark:to-emerald-900 sm:mb-6 sm:px-6 sm:py-3 sm:text-sm"
              >
                <Star className="ml-2 h-4 w-4 text-yellow-500" aria-hidden />
                {formatBadge(copy.badgeTemplate, countryLabel)}
              </Badge>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -24 }}
              transition={{ duration: 0.55 }}
              className="mx-auto min-h-[260px] max-w-4xl space-y-3 sm:min-h-[270px] sm:space-y-4 lg:min-h-[300px]"
              aria-live="polite"
            >
              <h1 className="text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-6xl xl:text-7xl">
                <span
                  className={`bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent`}
                >
                  {slide.title}
                </span>
              </h1>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 sm:text-2xl lg:text-3xl">
                {slide.subtitle}
              </h2>
              <p className="mx-auto max-w-3xl text-base leading-8 text-gray-600 dark:text-gray-400 sm:text-lg lg:text-xl lg:leading-9">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mx-auto mt-1 max-w-4xl"
          >
            <HeroActions
              lang={lang}
              typeLabel={typeLabel}
              primaryHref={browseTypeHref}
              secondaryHref={browseAcademiesHref}
              tertiaryHref={browseSchoolsHref}
              secondaryLabel={copy.ctaSecondaryLabel}
              tertiaryLabel={copy.ctaTertiaryLabel}
            />
          </motion.div>

          {!reduceMotion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center gap-3 pt-6"
              aria-label="مؤشرات الشرائح"
            >
              {copy.slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={
                    (lang === "ar" ? "انتقال إلى الشريحة رقم " : "Go to slide ") +
                    (index + 1)
                  }
                  aria-current={index === currentSlide ? "true" : "false"}
                  className={[
                    "h-3 w-3 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                    index === currentSlide
                      ? `bg-gradient-to-r ${slide.gradient} shadow-lg`
                      : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500",
                  ].join(" ")}
                />
              ))}
            </motion.div>
          )}
        </div>

        {decorationsReady ? (
          <LazyFeaturesGrid copy={copy} allowMotion={!isSmallScreen} />
        ) : (
          <FeaturesGridFallback />
        )}
      </div>
    </section>
  );
}

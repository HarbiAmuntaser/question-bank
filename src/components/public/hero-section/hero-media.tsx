// file: src/components/public/hero-section/hero-media.tsx
/**
 * Hero Media
 * ----------
 * الجزء الخاص بالصورة + بطاقة صغيرة داخل الصورة.
 * تحسين أداء مهم:
 * - Image priority فقط للشريحة الأولى لتقليل ضغط LCP.
 */

// file: src/components/public/hero-section/hero-media.tsx

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { HeroSlide } from "@/content/hero";
import type { LucideIcon } from "lucide-react";
import { Award, Star } from "lucide-react";

type Props = {
  slide: HeroSlide;
  currentSlide: number;
  reduceMotion: boolean;
  SlideIcon: LucideIcon;
  lang: "ar" | "en";
  isSmallScreen: boolean; // ✅ NEW
};

export function HeroMedia({
  slide,
  currentSlide,
  reduceMotion,
  SlideIcon,
  lang,
  isSmallScreen,
}: Props) {
  // ✅ انتقال أخف للجوال/الآيباد
  const enter = reduceMotion
    ? {}
    : isSmallScreen
      ? { opacity: 1, scale: 1 }
      : { opacity: 1, scale: 1, rotateY: 0 };

  const initial = reduceMotion
    ? false
    : isSmallScreen
      ? { opacity: 0, scale: 0.98 }
      : { opacity: 0, scale: 0.8, rotateY: 90 };

  const exit = reduceMotion
    ? {}
    : isSmallScreen
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.8, rotateY: -90 };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 50 }}
      animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="relative"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={initial}
          animate={enter}
          exit={exit}
          transition={{ duration: isSmallScreen ? 0.45 : 0.8 }}
          className="relative"
        >
          <div className="relative h-[260px] w-full overflow-hidden rounded-2xl shadow-xl sm:h-[360px] sm:rounded-3xl md:h-[420px] lg:h-[560px] lg:shadow-2xl xl:h-[600px]">
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-20`} aria-hidden />

            <Image
              // ✅ صور محلية من public
              src={slide.image || "/placeholder.svg"}
              alt={slide.title}
              fill
              className="object-cover"
              // ✅ LCP: الأول فقط
              priority={currentSlide === 0}
              // ✅ sizes أدق للجوال/الآيباد
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 50vw"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden />

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <div className="flex items-center gap-3 text-white sm:gap-4">
                <div className={`rounded-2xl bg-gradient-to-r ${slide.gradient} p-3 shadow-lg sm:p-4`} aria-hidden>
                  <SlideIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-base font-bold sm:text-xl">{slide.subtitle}</h3>
                  <p className="line-clamp-1 text-sm text-white/80 sm:text-base">
                    {lang === "ar" ? "تعلم مع أفضل المنصات التعليمية" : "Learn with the best tools"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ العناصر العائمة: أوقفها على الجوال/الآيباد */}
          {!reduceMotion && !isSmallScreen && (
            <>
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 w-24 h-24 bg-[image:linear-gradient(90deg,hsl(var(--brand-amber)),hsl(35_92%_50%))] rounded-full shadow-lg flex items-center justify-center"
                aria-hidden
              >
                <Award className="h-12 w-12 text-white" />
              </motion.div>

              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 w-20 h-20 bg-[image:var(--gradient-primary)] rounded-full shadow-lg flex items-center justify-center"
                aria-hidden
              >
                <Star className="h-10 w-10 text-white" />
              </motion.div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}


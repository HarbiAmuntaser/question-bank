// file: src/components/public/hero-section/features-grid.tsx
"use client";

/**
 * FeaturesGrid
 * ------------
 * شبكة المزايا أسفل الهيرو
 * - تستقبل copy من نوع HeroCopy (بدون any)
 */

import { motion, useReducedMotion } from "framer-motion";
import { ICON_MAP } from "./icon-map";
import type { HeroCopy } from "@/content/hero";

type Props = {
  copy: HeroCopy;
  /** اختياري: نخفف الحركة على الجوال/الآيباد */
  allowMotion?: boolean;
};

export function FeaturesGrid({ copy, allowMotion = true }: Props) {
  const reduceMotion = useReducedMotion();
  const canAnimate = allowMotion && !reduceMotion;

  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:mt-20 lg:gap-8">
      {copy.features.map((f, i) => {
        const FeatureIcon = ICON_MAP[f.icon] ?? ICON_MAP.book;
        const card = (
          <div className="h-full rounded-xl border-2 bg-card/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
            <div className="flex h-full flex-col p-5 text-center sm:p-6 lg:p-8">
              <div
                className={`w-16 h-16 ${f.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${f.gradient} rounded-xl flex items-center justify-center`}
                >
                  <FeatureIcon className="h-6 w-6 text-white" aria-hidden />
                </div>
              </div>

              <h3 className="mb-4 text-xl font-bold text-foreground">
                {f.title}
              </h3>
              <p className="flex-grow leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          </div>
        );

        if (!canAnimate) {
          return (
            <div key={`${f.title}-${i}`} className="group">
              {card}
            </div>
          );
        }

        return (
          <motion.div
            key={`${f.title}-${i}`}
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
            transition={canAnimate ? { delay: 0.12 + i * 0.08 } : undefined}
            whileHover={canAnimate ? { y: -6 } : undefined}
            className="group"
          >
            {card}
          </motion.div>
        );
      })}
    </div>
  );
}

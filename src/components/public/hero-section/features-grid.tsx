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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
      {copy.features.map((f, i) => {
        const FeatureIcon = ICON_MAP[f.icon] ?? ICON_MAP.book;

        return (
          <motion.div
            key={`${f.title}-${i}`}
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
            transition={canAnimate ? { delay: 0.12 + i * 0.08 } : undefined}
            whileHover={canAnimate ? { y: -6 } : undefined}
            className="group"
          >
            <div className="h-full border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
              <div className="p-8 text-center h-full flex flex-col">
                <div
                  className={`w-16 h-16 ${f.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${f.gradient} rounded-xl flex items-center justify-center`}
                  >
                    <FeatureIcon className="h-6 w-6 text-white" aria-hidden />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">
                  {f.description}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

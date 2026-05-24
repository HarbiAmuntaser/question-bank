// file: src/components/public/hero-section/background.tsx
/**
 * Hero Background
 * ---------------
 * خلفيات زخرفية خفيفة + تدرج متحرك (إن لم يكن Reduce Motion).
 */

import { motion } from "framer-motion";

export function HeroBackground({ animate }: { animate: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[url('/patterns/islamic-pattern.svg')] opacity-5" />

      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r opacity-10"
          animate={{
            background: [
              "linear-gradient(45deg, #10b981, #3b82f6)",
              "linear-gradient(45deg, #3b82f6, #8b5cf6)",
              "linear-gradient(45deg, #8b5cf6, #10b981)",
            ],
          }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      )}
    </div>
  );
}

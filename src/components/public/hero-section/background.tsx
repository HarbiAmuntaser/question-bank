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
              "linear-gradient(45deg, hsl(var(--brand-emerald)), hsl(var(--brand-cyan)))",
              "linear-gradient(45deg, hsl(var(--brand-cyan)), hsl(var(--brand-teal)))",
              "linear-gradient(45deg, hsl(var(--brand-teal)), hsl(var(--brand-emerald)))",
            ],
          }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      )}
    </div>
  );
}

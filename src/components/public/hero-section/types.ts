// file: src/components/public/hero-section/types.ts
/**
 * Types
 * -----
 * تعريف أنواع props المستخدمة في HeroSection.
 */

import type { InstitutionType, Lang, HeroSlide } from "@/content/hero";

export type HeroSectionProps = {
  cc?: string; // SA | YE (حالياً)
  type?: InstitutionType; // university | school | academy
  lang?: Lang; // ar | en
};

export type HeroCopy = {
  badgeTemplate: string;
  slides: HeroSlide[];
  features: Array<{
    title: string;
    description: string;
    icon: string;
    gradient: string;
    bgColor: string;
  }>;
};

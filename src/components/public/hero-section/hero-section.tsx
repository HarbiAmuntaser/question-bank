import { Sparkles } from "lucide-react";

import {
  COUNTRY_LABELS,
  HERO_I18N,
  TYPE_LABELS,
  type Lang,
} from "@/content/hero";

import { HeroActions } from "./hero-actions";
import { HeroPreviewCard } from "./hero-preview-card";
import type { HeroSectionProps } from "./types";
import { buildHeroLinks, formatBadge, normalizeCc, normalizeType } from "./utils";

export function HeroSection({
  cc: rawCc = "SA",
  type: rawType = "university",
  lang: rawLang = "ar",
}: HeroSectionProps) {
  const cc = normalizeCc(rawCc);
  const type = normalizeType(rawType);
  const lang: Lang = rawLang === "en" ? "en" : "ar";
  const copy = HERO_I18N[lang]?.[cc as "SA" | "YE"] ?? HERO_I18N.ar.default;
  const countryLabel = COUNTRY_LABELS[cc]?.ar ?? cc;
  const typeLabel = TYPE_LABELS[type]?.ar ?? "المؤسسات";
  const { browseAcademiesHref, browseSchoolsHref, browseTypeHref } =
    buildHeroLinks(cc, type);

  return (
    <section
      className="relative overflow-hidden border-b bg-gradient-to-br from-background via-teal-50/50 to-background dark:via-teal-950/20"
      aria-label="القسم التعريفي الرئيسي"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-teal-400/60 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" aria-hidden />
      <div className="pointer-events-none absolute -right-28 bottom-8 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-400/10" aria-hidden />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-12">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-right">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-background/80 px-4 py-2 text-xs font-bold text-teal-800 shadow-sm dark:border-teal-900/70 dark:bg-slate-950/60 dark:text-teal-200">
              <Sparkles className="h-4 w-4" aria-hidden />
              {formatBadge(copy.badgeTemplate, countryLabel)}
            </div>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.18] tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              {copy.title}
              <span className="mt-2 block bg-gradient-to-l from-teal-700 via-emerald-600 to-cyan-600 bg-clip-text text-transparent dark:from-teal-300 dark:via-emerald-300 dark:to-cyan-300">
                {copy.highlightedTitle}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-foreground/85 sm:text-xl">
              {copy.subtitle}
            </p>
            <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-foreground/70 sm:text-lg">
              {copy.description}
            </p>

            <div className="mt-7">
              <HeroActions
                typeLabel={typeLabel}
                primaryHref={browseTypeHref}
                secondaryHref={browseAcademiesHref}
                tertiaryHref={browseSchoolsHref}
                primaryLabel={copy.ctaPrimaryLabel}
                secondaryLabel={copy.ctaSecondaryLabel}
                tertiaryLabel={copy.ctaTertiaryLabel}
              />
            </div>

          </div>

          <div className="lg:justify-self-start">
            <HeroPreviewCard preview={copy.preview} />
          </div>
        </div>
      </div>
    </section>
  );
}

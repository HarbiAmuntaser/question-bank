
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
import { schoolEnabled } from "@/config/public-features";

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
      className="relative overflow-hidden border-b bg-[radial-gradient(circle_at_top_right,hsl(var(--brand-teal)_/_0.16),transparent_34%),radial-gradient(circle_at_bottom_left,hsl(var(--brand-cyan)_/_0.14),transparent_32%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--brand-teal)_/_0.08)_48%,hsl(var(--background))_100%)] dark:bg-[radial-gradient(circle_at_top_right,hsl(var(--brand-teal)_/_0.16),transparent_34%),radial-gradient(circle_at_bottom_left,hsl(var(--brand-cyan)_/_0.12),transparent_32%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--brand-teal)_/_0.16)_48%,hsl(var(--background))_100%)]"
      aria-label="القسم التعريفي الرئيسي"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/70 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,hsl(var(--brand-teal)_/_0.10)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--brand-teal)_/_0.10)_1px,transparent_1px)] [background-size:44px_44px] dark:opacity-[0.08]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-[hsl(var(--brand-cyan)_/_0.10)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-28 bottom-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(340px,0.94fr)] lg:gap-12">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-right">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/85 px-4 py-2 text-xs font-bold text-primary shadow-sm backdrop-blur dark:border-primary/35 dark:bg-slate-950/60">
              <Sparkles className="h-4 w-4 text-[hsl(var(--brand-amber))]" aria-hidden />
              {formatBadge(copy.badgeTemplate, countryLabel)}
            </div>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.16] tracking-normal text-foreground sm:text-5xl lg:text-4xl">
              {copy.title}
              <span className="mt-2 block bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                {copy.highlightedTitle}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-foreground/85 sm:text-xl lg:mx-0">
              {copy.subtitle}
            </p>

            <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-foreground/70 sm:text-lg">
              {copy.description}
            </p>

            <div className="mt-8">
              <HeroActions
                typeLabel={typeLabel}
                primaryHref={browseTypeHref}
                secondaryHref={browseAcademiesHref}
                tertiaryHref={schoolEnabled ? browseSchoolsHref : undefined}
                primaryLabel={copy.ctaPrimaryLabel}
                secondaryLabel={copy.ctaSecondaryLabel}
                tertiaryLabel={schoolEnabled ? copy.ctaTertiaryLabel : undefined}
              />
            </div>
          </div>

          <div className="w-full lg:justify-self-center">
            <HeroPreviewCard preview={copy.preview} />
          </div>
        </div>
      </div>
    </section>
  );
}

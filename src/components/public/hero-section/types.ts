import type { HeroCopy, InstitutionType, Lang } from "@/content/hero";

export type HeroSectionProps = {
  cc?: string;
  type?: InstitutionType;
  lang?: Lang;
};

export type HeroActionsProps = {
  typeLabel: string;
  primaryHref: string;
  secondaryHref: string;
  tertiaryHref: string;
  primaryLabel: string;
  secondaryLabel: string;
  tertiaryLabel: string;
};

export type HeroPreviewCardProps = {
  preview: HeroCopy["preview"];
};

export type HeroStatsProps = {
  stats: HeroCopy["stats"];
};

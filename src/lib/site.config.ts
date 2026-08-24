import { formatArabicList, getEnabledPublicTypeLabels } from "@/config/public-features";

const publicSections = formatArabicList(getEnabledPublicTypeLabels());

export const SITE = {
  NAME: "مستواك",
  DESCRIPTION: `منصة تعليمية عربية للتدريب والمراجعة عبر اختبارات وملخصات منظمة ضمن ${publicSections}.`,
  DOMAIN: "mustawak.com",
  URL: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mustawak.com").replace(/\/+$/, ""),
  LOCALE: "ar",
  THEME_COLOR_LIGHT: "#0f766e",
  THEME_COLOR_DARK: "#14b8a6",
} as const;

export const SITE = {
  NAME: "مستواك",
  DESCRIPTION: "منصة تعليمية عربية للتدريب والمراجعة عبر اختبارات منظمة للجامعات والمدارس والأكاديميات.",
  DOMAIN: "mustawak.com",
  URL: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mustawak.com").replace(/\/+$/, ""),
  LOCALE: "ar",
  THEME_COLOR_LIGHT: "#0f766e",
  THEME_COLOR_DARK: "#14b8a6",
} as const;

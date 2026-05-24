export const SITE = {
  NAME: "بنك الأسئلة السعودي",
  DESCRIPTION: "منصة أسئلة، فصول، واختبارات سابقة لطلاب الجامعات السعودية.",
  // اضبطه في env: NEXT_PUBLIC_SITE_URL=https://example.com
  URL: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  LOCALE: "ar",
  THEME_COLOR_LIGHT: "#14532d", // saudi green
  THEME_COLOR_DARK: "#15803d",
};
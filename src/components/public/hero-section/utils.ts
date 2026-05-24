// file: src/components/public/hero-section/utils.ts
/**
 * Utils
 * -----
 * أدوات خفيفة لإبقاء مكوّن HeroSection نظيف وقابل للصيانة.
 */

// file: src/components/public/hero-section/utils.ts

import type { Lang, InstitutionType } from "@/content/hero";

export function getDocumentLang(): Lang {
  if (typeof document === "undefined") return "ar";
  const l = document.documentElement.getAttribute("lang")?.toLowerCase() ?? "ar";
  return l.startsWith("en") ? "en" : "ar";
}

export function normalizeCc(cc?: string) {
  const v = (cc || "SA").trim().toUpperCase();
  return v === "YE" ? "YE" : "SA";
}

export function formatBadge(template: string, countryName: string) {
  return template.replace("{{country}}", countryName);
}

/**
 * ✅ روابط متوافقة مع الهيدر:
 * - استعراض هذا النوع (حسب type): /{cc}/{type}
 * - "الاختبارات الأكاديمية" = الأكاديميات: /{cc}/academy
 */
export function buildHeroLinks(cc: string, type: InstitutionType) {
  return {
    browseTypeHref: `/${cc}/${type}`,
    browseAcademiesHref: `/${cc}/academy`,
        // ✅ الزر الثالث: "الاختبارات المدرسية" = المدارس
    browseSchoolsHref: `/${cc}/school`,


  };
}

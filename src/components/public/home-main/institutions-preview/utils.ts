// file: src/components/public/home-main/institutions-preview/utils.ts

import type { InstType } from "./types";

/**
 * تطبيع كود الدولة (حاليًا ندعم SA/YE فقط)
 */
export function normalizeCountryCode(cc?: string) {
  const v = (cc || "SA").trim().toUpperCase();
  return v === "YE" ? "YE" : "SA";
}

/**
 * تطبيع نوع المؤسسة
 */
export function normalizeType(type?: string): InstType {
  const t = (type || "university").toLowerCase();
  if (t === "school" || t === "academy" || t === "university") return t;
  return "university";
}

/**
 * تسمية نوع المؤسسة بالعربية
 */
export function getTypeLabel(type: InstType) {
  switch (type) {
    case "school":
      return "المدارس";
    case "academy":
      return "المسارات التدريبية";
    default:
      return "الجامعات";
  }
}

/**
 * رابط صفحة عرض الكل حسب الهيكل الجديد:
 * /{cc}/{type}
 */
export function buildListHref(cc: string, type: InstType) {
  return `/${cc}/${type}`;
}

/**
 * رابط تفاصيل المؤسسة (نفس المسار الذي تستخدمه الآن داخل مشروعك):
 * /{cc}/{type}/universities/{slug}
 *
 * ملاحظة:
 * - slug قد يأتي من seo.slug أو seoSlug أو code أو id
 */
export function buildInstitutionHref(
  base: string,
  u: { id: string; code?: string | null; seo?: { slug?: string | null } | null; seoSlug?: string | null }
) {
  const seoSlug = u?.seo?.slug ?? (u as any)?.seoSlug ?? null;
  const raw = (seoSlug || u.code || u.id || "").toString();

  const cleaned = raw
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/^جامعات\//, "");

  const safe = cleaned ? encodeURIComponent(cleaned) : encodeURIComponent(u.id);
  return `${base}/universities/${safe}`;
}

/**
 * مصدر صورة محلي (اختياري) في حال لم توجد logoUrl
 * ضع صورة افتراضية في: public/images/institutions/default.svg
 */
export function getFallbackImageSrc(code?: string | null) {
  // Phase 1: use one guaranteed local placeholder until real hosted logos are enabled.
  return "/images/institutions/default.svg";
}

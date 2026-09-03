// file: src/config/regions.ts
/**
 * مصدر الحقيقة لتعريف الدول والأنواع المدعومة في الواجهة العامة.
 * - تستخدمه الواجهة (الهيدر/الفوتر) لبناء الروابط وعرض خيارات الدولة.
 * - يستخدمه الـ middleware للتحقق من المسارات وتخزين cc في الكوكيز.
 */

export type InstitutionType = "university" | "school" | "academy";
export type CountryCode = "SA" | "YE"; // ✅ حالياً: السعودية + اليمن فقط

// تعريف الدول المدعومة + الأنواع المتاحة داخل كل دولة
export const SUPPORTED_COUNTRIES: Record<
  CountryCode,
  { label: string; defaultType: InstitutionType; types: InstitutionType[] }
> = {
  SA: {
    label: "السعودية",
    defaultType: "university",
    types: ["university", "school", "academy"],
  },
  YE: {
    label: "اليمن",
    defaultType: "school",
    types: ["university", "school", "academy"],
  },
};

// الدولة الافتراضية عند عدم القدرة على تحديدها
export const DEFAULT_COUNTRY: CountryCode = "SA";

// Stable SEO owner for academy content that is intentionally shared across countries.
export const GLOBAL_ACADEMY_CANONICAL_COUNTRY: CountryCode = "SA";

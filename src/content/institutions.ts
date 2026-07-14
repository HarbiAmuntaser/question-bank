// file: src/content/institutions.ts
// نصوص ثابتة خاصة بقسم المؤسسات (جامعات/مدارس/أكاديميات) مع دعم لغتين

export type Lang = "ar" | "en";
export type InstitutionType = "university" | "school" | "academy";

export const CC_NAMES = {
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  YE: { ar: "اليمن", en: "Yemen" },
} as const;

export const TYPE_NAMES = {
  university: { ar: "الجامعات", en: "Universities" },
  school: { ar: "المدارس", en: "Schools" },
  academy: { ar: "المسارات التدريبية", en: "Training Tracks" },
} as const;

export const INSTITUTION_GRID_COPY = {
  title: (cc: keyof typeof CC_NAMES, type: keyof typeof TYPE_NAMES, lang: Lang) =>
    lang === "ar"
      ? `${TYPE_NAMES[type][lang]} في ${CC_NAMES[cc][lang]}`
      : `${TYPE_NAMES[type][lang]} in ${CC_NAMES[cc][lang]}`,

  subtitle: (cc: keyof typeof CC_NAMES, type: keyof typeof TYPE_NAMES, lang: Lang) =>
    lang === "ar"
      ? `استكشف أفضل ${TYPE_NAMES[type][lang]} في ${CC_NAMES[cc][lang]}`
      : `Explore top ${TYPE_NAMES[type][lang]} in ${CC_NAMES[cc][lang]}`,

  labels: {
    accredited: { ar: "معتمدة", en: "Accredited" },
    majors: { ar: "تخصص", en: "Majors" },
    quizzes: { ar: "اختبار", en: "Quizzes" },
    courses: { ar: "مقرر", en: "Courses" },
    searchPlaceholder: { ar: "ابحث بالاسم أو الرمز…", en: "Search by name or code…" },
    explore: (type: InstitutionType, lang: Lang) =>
      lang === "ar"
        ? type === "university"
          ? "استكشف الجامعة"
          : type === "school"
          ? "استكشف المدرسة"
          : "استكشف المسار التدريبي"
        : type === "university"
        ? "Explore university"
        : type === "school"
        ? "Explore school"
        : "Explore training track",
    viewAll: (type: InstitutionType, lang: Lang) =>
      lang === "ar" ? `عرض جميع ${TYPE_NAMES[type].ar}` : `View all ${TYPE_NAMES[type].en}`,
  },
} as const;

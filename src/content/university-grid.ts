/**
 * نصوص ثابتة لـ UniversityGrid حسب الدولة (cc) والنوع (type)
 */

type InstType = "university" | "school" | "academy";

type GridTexts = {
  heading: string;
  subheading: string;
  searchLabel: string;
  searchPlaceholder: string;
  badgeText: string;
  badgeAria: string;
  statMajors: string;
  statQuizzes: string;
  statSubjects: string;
  popularMajors: string;
  more: string;
  ctaExplore: string;
  noResultsTitle: string;
  noResultsText: string;
  viewAll: string;
};

const base: GridTexts = {
  heading: "المؤسسات التعليمية",
  subheading: "استكشف أفضل المؤسسات واختر ما يناسبك",
  searchLabel: "ابحث عن مؤسسة...",
  searchPlaceholder: "ابحث بالاسم أو الرمز...",
  badgeText: "موثوق",
  badgeAria: "مؤسسة موثوقة",
  statMajors: "تخصص",
  statQuizzes: "اختبار",
  statSubjects: "مقرر",
  popularMajors: "التخصصات الشائعة",
  more: "المزيد",
  ctaExplore: "استكشف المؤسسة",
  noResultsTitle: "لا توجد نتائج",
  noResultsText: "جرّب كلمات بحث مختلفة",
  viewAll: "عرض الكل",
};

const byType: Record<InstType, Partial<GridTexts>> = {
  university: {
    heading: "الجامعات",
    subheading: "استكشف الجامعات المتاحة وفق بلدك ونوع الدراسة",
    statMajors: "تخصص",
    statSubjects: "مقرر",
    ctaExplore: "استكشف الجامعة",
  },
  school: {
    heading: "المدارس",
    subheading: "تصفح المدارس والاختبارات الوزارية والمستويات الدراسية",
    statMajors: "مسار",
    statSubjects: "مادة",
    ctaExplore: "استكشف المدرسة",
  },
  academy: {
    heading: "الأكاديميات",
    subheading: "اعثر على الأكاديميات والدورات المعتمدة",
    statMajors: "برنامج",
    statSubjects: "وحدة",
    ctaExplore: "استكشف الأكاديمية",
  },
};

const byCountry: Record<string, Partial<GridTexts>> = {
  SA: {
    badgeText: "معتمدة",
    subheading: "استكشف المؤسسات في المملكة العربية السعودية",
  },
  YE: {
    badgeText: "موثوقة",
    subheading: "استكشف المؤسسات في اليمن",
  },
};

export function getUniversityGridTexts(cc: string, type: InstType): GridTexts {
  const ccU = cc.toUpperCase();
  return {
    ...base,
    ...(byType[type] ?? {}),
    ...(byCountry[ccU] ?? {}),
  } as GridTexts;
}

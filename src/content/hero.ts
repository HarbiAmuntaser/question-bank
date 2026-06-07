/**
 * Hero content for Mustawak.
 *
 * The displayed copy is Arabic-only. The `en` key is kept as an alias for
 * compatibility with older props/imports until a full i18n layer is needed.
 */

export type Lang = "ar" | "en";
export type InstitutionType = "university" | "school" | "academy";

type SlideIcon = "graduation" | "trophy" | "users";
type FeatureIcon = "book" | "users" | "trophy";
type CountryKey = "default" | "SA" | "YE";

export type HeroSlide = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  gradient: string;
  icon: SlideIcon;
};

export type HeroFeature = {
  title: string;
  description: string;
  gradient: string;
  bgColor: string;
  icon: FeatureIcon;
};

export type HeroStat = {
  label: string;
  description: string;
};

export type HeroPreview = {
  badge: string;
  title: string;
  description: string;
  questions: string;
  duration: string;
  level: string;
  scoreLabel: string;
  scoreValue: string;
  progressLabel: string;
  progressValue: number;
  successNote: string;
};

export type HeroCopy = {
  badgeTemplate: string;
  title: string;
  highlightedTitle: string;
  subtitle: string;
  description: string;
  preview: HeroPreview;
  stats: HeroStat[];

  // Legacy shape kept so old hero helper files remain type-safe if imported later.
  slides: HeroSlide[];
  features: HeroFeature[];

  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  ctaTertiaryLabel: string;
  searchPlaceholder: string;
};

export const COUNTRY_LABELS: Record<string, { ar: string; en: string }> = {
  SA: { ar: "السعودية", en: "السعودية" },
  YE: { ar: "اليمن", en: "اليمن" },
};

export const TYPE_LABELS: Record<InstitutionType, { ar: string; en: string }> = {
  university: { ar: "الجامعات", en: "الجامعات" },
  school: { ar: "المدارس", en: "المدارس" },
  academy: { ar: "الأكاديميات", en: "الأكاديميات" },
};

const sharedFeatures: HeroFeature[] = [
  {
    icon: "book",
    title: "تنظيم حسب المسار",
    description: "انتقل من الجهة التعليمية إلى التخصص ثم المقرر والاختبار بسهولة.",
    gradient: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    icon: "trophy",
    title: "تدريب أقرب للواقع",
    description: "نماذج منظمة تساعدك على قياس جاهزيتك قبل الاختبار.",
    gradient: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: "users",
    title: "تجربة واضحة",
    description: "واجهة عربية مباشرة ونتائج مفهومة بدون تعقيد.",
    gradient: "from-cyan-500 to-sky-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
];

function buildSlides(title: string, subtitle: string, description: string): HeroSlide[] {
  return [
    {
      title,
      subtitle,
      description,
      image: "/images/hero/hero-1.svg",
      gradient: "from-teal-700 via-emerald-600 to-cyan-500",
      icon: "graduation",
    },
  ];
}

const basePreview: HeroPreview = {
  badge: "محاكاة اختبار",
  title: "اختبار تدريبي",
  description: "تدرّب قبل الاختبار الحقيقي",
  questions: "25 سؤال",
  duration: "30 دقيقة",
  level: "متوسط",
  scoreLabel: "جاهزيتك الحالية",
  scoreValue: "82%",
  progressLabel: "مؤشر الجاهزية",
  progressValue: 82,
  successNote: "مؤشر جيد، راجع الأسئلة الصعبة قبل موعد الاختبار.",
};

const defaultCopy: HeroCopy = {
  badgeTemplate: "منصة مستواك للطلاب في {{country}}",
  title: "اختبر جاهزيتك",
  highlightedTitle: "وتدرّب بثقة",
  subtitle: "نماذج وأسئلة منظمة تصل بك إلى الاختبار المناسب بسرعة.",
  description:
    "نماذج اختبارات وأسئلة منظمة حسب الدولة، الجهة التعليمية، التخصص، والمقرر؛ لتراجع بطريقة أوضح وتقيس مستواك قبل الاختبار.",
  preview: basePreview,
  stats: [
    { label: "جهات تعليمية", description: "قابل للتوسع" },
    { label: "مقررات منظمة", description: "تصنيف واضح" },
    { label: "اختبارات تدريبية", description: "تدريب وقياس" },
  ],
  slides: buildSlides(
    "اختبر جاهزيتك",
    "وتدرّب بثقة",
    "نماذج اختبارات وأسئلة منظمة تساعدك على معرفة مستواك."
  ),
  features: sharedFeatures,
  ctaPrimaryLabel: "استعراض المؤسسات",
  ctaSecondaryLabel: "استعراض الاختبارات الأكاديمية",
  ctaTertiaryLabel: "استعراض الاختبارات المدرسية",
  searchPlaceholder: "ابحث عن جامعة، تخصص، مقرر، أو اختبار...",
};

const saCopy: HeroCopy = {
  ...defaultCopy,
  ctaPrimaryLabel: "استعراض الجامعات",
};

const yeCopy: HeroCopy = {
  ...defaultCopy,
  badgeTemplate: "منصة مستواك للطلاب في {{country}}",
  subtitle: "اختبارات منظمة تساعدك على المراجعة وقياس الجاهزية.",
  description:
    "اختر الجهة التعليمية ثم التخصص والمقرر، وابدأ التدريب على نماذج واضحة تساعدك على قياس مستواك قبل الاختبار.",
  ctaPrimaryLabel: "استعراض المؤسسات",
};

const arContent: Record<CountryKey, HeroCopy> = {
  default: defaultCopy,
  SA: saCopy,
  YE: yeCopy,
};

export const HERO_I18N: Record<Lang, Record<CountryKey, HeroCopy>> = {
  ar: arContent,
  en: arContent,
};

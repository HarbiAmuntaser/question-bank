
/**
 * Hero content for Mustawak.
 *
 * المحتوى المعروض عربي فقط حاليًا.
 * تم الإبقاء على مفتاح en كنسخة عربية مؤقتة حتى لا تنكسر أي استدعاءات قديمة.
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
    title: "مسار واضح للمراجعة",
    description: "ابدأ من الجهة التعليمية، ثم التخصص والمقرر، وصولًا إلى الاختبار المناسب.",
    gradient: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    icon: "trophy",
    title: "تدريب يقيس جاهزيتك",
    description: "اختبارات منظمة تساعدك على معرفة مستواك وتحديد ما يحتاج إلى مراجعة.",
    gradient: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: "users",
    title: "تجربة عربية مبسطة",
    description: "واجهة واضحة وسهلة الاستخدام تساعد الطالب على الوصول للمحتوى دون تعقيد.",
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
  successNote: "مؤشر جيد، واصل التدريب وراجع الأسئلة التي تحتاج إلى تركيز أكبر.",
};

const defaultCopy: HeroCopy = {
  badgeTemplate: "منصة مستواك للتدريب والاختبارات في {{country}}",
  title: "اختبر جاهزيتك",
  highlightedTitle: "وتدرّب بثقة",
  subtitle: "منصة تساعدك على الوصول إلى الاختبار المناسب وقياس مستواك بوضوح.",
  description:
    "استعرض نماذج اختبارات وأسئلة منظمة حسب الدولة، الجهة التعليمية، التخصص، والمقرر؛ لتراجع بطريقة أسهل وتعرف مستوى استعدادك قبل الاختبار.",
  preview: basePreview,
  stats: [
    { label: "جهات تعليمية", description: "تنظيم حسب الدولة والمسار" },
    { label: "مقررات منظمة", description: "وصول أسرع للمحتوى المطلوب" },
    { label: "اختبارات تدريبية", description: "مراجعة وقياس للجاهزية" },
  ],
  slides: buildSlides(
    "اختبر جاهزيتك",
    "وتدرّب بثقة",
    "نماذج اختبارات وأسئلة منظمة تساعدك على معرفة مستواك قبل الاختبار."
  ),
  features: sharedFeatures,
  ctaPrimaryLabel: "استعراض المؤسسات",
  ctaSecondaryLabel: "استعراض الاختبارات الأكاديمية",
  ctaTertiaryLabel: "استعراض الاختبارات المدرسية",
  searchPlaceholder: "ابحث عن جامعة، تخصص، مقرر، أو اختبار...",
};

const saCopy: HeroCopy = {
  ...defaultCopy,
  badgeTemplate: "منصة مستواك لطلاب {{country}}",
  subtitle: "نماذج وأسئلة منظمة حسب الجامعات والتخصصات والمقررات.",
  description:
    "اختر جامعتك، ثم تخصصك ومقررك، وابدأ التدريب على اختبارات تساعدك على قياس جاهزيتك قبل الاختبار الحقيقي.",
  preview: {
    ...basePreview,
    title: "اختبار جامعي تدريبي",
    description: "راجع مقررًا جامعيًا بطريقة أقرب للاختبار",
    questions: "25 سؤال",
    duration: "30 دقيقة",
    level: "متوسط",
    scoreValue: "82%",
    progressValue: 82,
    successNote: "مستوى جيد، ركّز على الأسئلة الصعبة وكرّر المحاولة لتحسين جاهزيتك.",
  },
  ctaPrimaryLabel: "استعراض الجامعات",
};

const yeCopy: HeroCopy = {
  ...defaultCopy,
  badgeTemplate: "منصة مستواك لطلاب {{country}}",
  subtitle: "اختبارات منظمة تساعدك على المراجعة وقياس الجاهزية.",
  description:
    "ابدأ من الجهة التعليمية، اختر التخصص أو المقرر، ثم تدرّب على نماذج واضحة تساعدك على معرفة مستواك قبل الاختبار.",
  preview: {
    ...basePreview,
    title: "اختبار مراجعة تدريبي",
    description: "تدرّب على أسئلة منظمة قبل الاختبار",
    questions: "20 سؤال",
    duration: "25 دقيقة",
    level: "مناسب للمراجعة",
    scoreValue: "78%",
    progressValue: 78,
    successNote: "مؤشر جيد، استمر في المراجعة وركّز على النقاط التي تحتاج إلى تحسين.",
  },
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

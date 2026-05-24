/**
 * ملف نصوص ثابتة لواجهة الهيرو (i18n)
 * يدعم العربية والإنجليزية، ويحتوي على نسخة عامة + تخصيص للسعودية (SA) واليمن (YE).
 * يمكن توسيعه لاحقًا لدول إضافية أو أقسام أخرى.
 */

export type Lang = "ar" | "en";
export type InstitutionType = "university" | "school" | "academy";

type SlideIcon = "graduation" | "trophy" | "users";
type FeatureIcon = "book" | "users" | "trophy";

export type HeroSlide = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  gradient: string; // tailwind gradient classes
  icon: SlideIcon;
};

export type HeroFeature = {
  title: string;
  description: string;
  gradient: string; // tailwind gradient classes
  bgColor: string;  // tailwind color (light/dark safe)
  icon: FeatureIcon;
};

export type HeroCopy = {
  // نص يظهر في الشارة العلوية الصغيرة — يدعم قالب {{country}}
  badgeTemplate: string;
  // الشرائح
  slides: HeroSlide[];
  // مربعات المزايا
  features: HeroFeature[];
  // نصوص الأزرار (الروابط تُبنى في الكومبوننت حسب cc/type)
  ctaPrimaryLabel: string;   // مثل: "استعراض الجامعات"
  ctaSecondaryLabel: string; // مثل: "استكشاف الاختبارات"
  // Placeholder لشريط البحث (إن أردت إظهاره في الهيرو)
  searchPlaceholder: string;

  ctaTertiaryLabel: string;   // ✅ NEW: استعراض الاختبارات المدرسية (يروح للمدارس)

};

type CountryKey = "default" | "SA" | "YE";

export const COUNTRY_LABELS: Record<string, { ar: string; en: string }> = {
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  YE: { ar: "اليمن", en: "Yemen" },
};

export const TYPE_LABELS: Record<InstitutionType, { ar: string; en: string }> = {
  university: { ar: "الجامعات", en: "Universities" },
  school: { ar: "المدارس", en: "Schools" },
  academy: { ar: "الأكاديميات", en: "Academies" },
};

export const HERO_I18N: Record<Lang, Record<CountryKey, HeroCopy>> = {
  ar: {
    default: {
      badgeTemplate: "منصة تعليم {{country}}",
      slides: [
        {
          title: "تعلّم بذكاء",
          subtitle: "اختبارات تفاعلية وتحليل أداء",
          description: "تدرّب على بنوك أسئلة دقيقة وتابِع تقدّمك خطوة بخطوة.",
          image: "/images/saudi-students-1.jpg",
          gradient: "from-green-600 via-green-500 to-emerald-400",
          icon: "graduation",
        },
        {
          title: "كل شيء في مكان واحد",
          subtitle: "تخصصات ومقررات ومؤسسات",
          description: "استكشف المؤسسات والتخصصات والاختبارات من نفس الواجهة.",
          image: "/images/saudi-students-2.jpg",
          gradient: "from-blue-600 via-blue-500 to-cyan-400",
          icon: "trophy",
        },
        {
          title: "مجتمع متعاون",
          subtitle: "انضم لآلاف الطلاب",
          description: "تعلم مع مجتمع نشِط وشارك خبراتك مع الآخرين.",
          image: "/images/saudi-students-3.jpg",
          gradient: "from-purple-600 via-purple-500 to-pink-400",
          icon: "users",
        },
      ],
      features: [
        {
          icon: "book",
          title: "مكتبة شاملة",
          description: "آلاف الأسئلة والتجميعات المصنّفة بدقة.",
          gradient: "from-blue-500 to-cyan-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          icon: "users",
          title: "مجتمع تفاعلي",
          description: "مناقشات ونصائح عملية لتحسين استراتيجيتك.",
          gradient: "from-green-500 to-emerald-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
        },
        {
          icon: "trophy",
          title: "تحليلات دقيقة",
          description: "لوحة أداء تُظهر نقاط قوتك ونقاط التحسين.",
          gradient: "from-purple-500 to-pink-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/20",
        },
      ],
      ctaPrimaryLabel: "استعراض المؤسسات",
      ctaTertiaryLabel: "استعرض الاختبارات المدرسية",

      ctaSecondaryLabel: "استكشاف الاختبارات",
      searchPlaceholder: "ابحث عن اختبار، مقرر، أو مؤسسة...",
    },
    SA: {
      // تخصيص طفيف للسعودية
      badgeTemplate: "منصة التعلم الرائدة في {{country}}",
      slides: [
        {
          title: "بنك الأسئلة السعودي",
          subtitle: "اختبارات دقيقة ومتجددة",
          description: "مصادر موثوقة تساعدك على الاستعداد المسبق بثقة.",
          image: "/images/saudi-students-1.jpg",
          gradient: "from-green-600 via-green-500 to-emerald-400",
          icon: "graduation",
        },
        {
          title: "تتبع تقدمك",
          subtitle: "تقارير وقياسات مفيدة",
          description: "حلّل أداءك وحدد مسارات تحسينك بسهولة.",
          image: "/images/saudi-students-2.jpg",
          gradient: "from-blue-600 via-blue-500 to-cyan-400",
          icon: "trophy",
        },
        {
title: "مجتمع طلاب السعودية",
          subtitle: "تبادل الخبرة",
          description: "استفد من خبرات زملائك في مختلف التخصصات.",
          image: "/images/saudi-students-3.jpg",
          gradient: "from-purple-600 via-purple-500 to-pink-400",
          icon: "users",
        },
      ],
      features: [
        {
          icon: "book",
          title: "بنوك واسعة",
          description: "أسئلة من جامعات ومؤسسات سعودية متنوعة.",
          gradient: "from-blue-500 to-cyan-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          icon: "users",
          title: "مجتمع نشِط",
          description: "مجموعات، نصائح، ومشاركة خبرات محلية.",
          gradient: "from-green-500 to-emerald-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
        },
        {
          icon: "trophy",
          title: "قياس الأداء",
          description: "أدوات قياس تُبرز نقاط القوة والضعف.",
          gradient: "from-purple-500 to-pink-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/20",
        },
      ],
      ctaPrimaryLabel: "استعراض المؤسسات",
      ctaTertiaryLabel: "استعرض الاختبارات المدرسية",

      ctaSecondaryLabel: "استكشاف الاختبارات",
      searchPlaceholder: "ابحث عن اختبار، مقرر، أو جامعة...",
    },
    YE: {
      badgeTemplate: "منصة التعلم المتكاملة في {{country}}",
      slides: [
        {
title: "بنك الأسئلة اليمن",
          subtitle: "جاهز للاختبارات الوزارية والجامعية",
          description: "محتوى مصمم ليساعدك على اجتياز الاختبارات بثقة.",
          image: "/images/saudi-students-1.jpg",
          gradient: "from-emerald-600 via-emerald-500 to-teal-400",
          icon: "graduation",
        },
        {
          title: "تدريب فعّال",
          subtitle: "اختبارات تحاكي الواقع",
          description: "جرّب نماذج واقعية وتدرّب على إدارة الوقت.",
          image: "/images/saudi-students-2.jpg",
          gradient: "from-cyan-600 via-sky-500 to-blue-400",
          icon: "trophy",
        },
        {
          title: "مجتمع اليمن",
          subtitle: "مساعدة ومشاركة",
          description: "تواصل مع زملائك وشارك تجاربك للدعم المتبادل.",
          image: "/images/saudi-students-3.jpg",
          gradient: "from-fuchsia-600 via-pink-500 to-rose-400",
          icon: "users",
        },
      ],
      features: [
        {
          icon: "book",
          title: "مصادر محلية",
          description: "محتوى يتوافق مع المناهج اليمنية.",
          gradient: "from-sky-500 to-cyan-400",
          bgColor: "bg-sky-50 dark:bg-sky-900/20",
        },
        {
          icon: "users",
          title: "تفاعل حي",
          description: "استفسارات ومناقشات تفيد الجميع.",
          gradient: "from-emerald-500 to-teal-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          icon: "trophy",
          title: "نتائج أفضل",
          description: "ركّز على مكامن الضعف وارتقِ بمستواك.",
          gradient: "from-fuchsia-500 to-rose-400",
          bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
        },
      ],
      ctaPrimaryLabel: "استعراض المؤسسات",
      ctaTertiaryLabel: "استعرض الاختبارات المدرسية",

ctaSecondaryLabel: "استعراض الاختبارات الأكاديمية",
      searchPlaceholder: "ابحث عن اختبار، مقرر، أو مؤسسة...",
    },
  },

  en: {
    default: {
      badgeTemplate: "A learning platform in {{country}}",
      slides: [
        {
          title: "Learn Smarter",
          subtitle: "Interactive exams & analytics",
          description: "Practice with accurate question banks and track your progress.",
          image: "/images/saudi-students-1.jpg",
          gradient: "from-green-600 via-green-500 to-emerald-400",
          icon: "graduation",
        },
        {
          title: "All-in-One",
          subtitle: "Programs, courses, institutions",
          description: "Explore institutions, majors, and exams in one place.",
          image: "/images/saudi-students-2.jpg",
          gradient: "from-blue-600 via-blue-500 to-cyan-400",
          icon: "trophy",
        },
        {
          title: "Collaborative Community",
          subtitle: "Join thousands of learners",
          description: "Learn with peers and share your experiences.",
          image: "/images/saudi-students-3.jpg",
          gradient: "from-purple-600 via-purple-500 to-pink-400",
          icon: "users",
        },
      ],
      features: [
        {
          icon: "book",
          title: "Rich Library",
          description: "Thousands of curated questions and collections.",
          gradient: "from-blue-500 to-cyan-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          icon: "users",
          title: "Active Community",
          description: "Discussions and practical tips to improve.",
          gradient: "from-green-500 to-emerald-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
        },
        {
          icon: "trophy",
          title: "Powerful Analytics",
          description: "Dashboards to reveal strengths and gaps.",
          gradient: "from-purple-500 to-pink-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/20",
        },
      ],
      ctaPrimaryLabel: "Browse institutions",
      ctaTertiaryLabel: "Browse School Exams",

      ctaSecondaryLabel: "Browse Academies",
      searchPlaceholder: "Search exams, courses, or institutions...",
    },
    SA: {
      badgeTemplate: "Leading learning in {{country}}",
      slides: [
        {
          title: "Saudi Question Bank",
          subtitle: "Accurate & fresh",
          description: "Trusted sources to help you prepare confidently.",
          image: "/images/saudi-students-1.jpg",
          gradient: "from-green-600 via-green-500 to-emerald-400",
          icon: "graduation",
        },
        {
          title: "Track Progress",
          subtitle: "Useful reports",
          description: "Analyze performance and plan how to improve.",
          image: "/images/saudi-students-2.jpg",
          gradient: "from-blue-600 via-blue-500 to-cyan-400",
          icon: "trophy",
        },
        {
          title: "Saudi Community",
          subtitle: "Share experience",
          description: "Learn from peers across many majors.",
          image: "/images/saudi-students-3.jpg",
          gradient: "from-purple-600 via-purple-500 to-pink-400",
          icon: "users",
        },
      ],
      features: [
        {
          icon: "book",
          title: "Wide Banks",
          description: "Questions from Saudi institutions.",
          gradient: "from-blue-500 to-cyan-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          icon: "users",
          title: "Active Community",
          description: "Local groups and helpful discussions.",
          gradient: "from-green-500 to-emerald-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
        },
        {
          icon: "trophy",
          title: "Performance",
          description: "Measure strengths and weaknesses.",
          gradient: "from-purple-500 to-pink-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/20",
        },
      ],
      ctaPrimaryLabel: "Browse institutions",
      ctaTertiaryLabel: "Browse School Exams",

      ctaSecondaryLabel: "Explore exams",
      searchPlaceholder: "Search exams, courses, or universities...",
    },
    YE: {
      badgeTemplate: "Your learning hub in {{country}}",
      slides: [
        {
          title: "Yemen Question Bank",
          subtitle: "For national & university exams",
          description: "Content tailored to help you pass with confidence.",
          image: "/images/saudi-students-1.jpg",
          gradient: "from-emerald-600 via-emerald-500 to-teal-400",
          icon: "graduation",
        },
        {
          title: "Effective Training",
          subtitle: "Realistic mock exams",
          description: "Practice time management with authentic models.",
          image: "/images/saudi-students-2.jpg",
          gradient: "from-cyan-600 via-sky-500 to-blue-400",
          icon: "trophy",
        },
        {
          title: "Yemen Community",
          subtitle: "Support & sharing",
          description: "Connect and learn with learners like you.",
          image: "/images/saudi-students-3.jpg",
          gradient: "from-fuchsia-600 via-pink-500 to-rose-400",
          icon: "users",
        },
      ],
      features: [
        {
          icon: "book",
          title: "Local Content",
          description: "Materials aligned with Yemeni curricula.",
          gradient: "from-sky-500 to-cyan-400",
          bgColor: "bg-sky-50 dark:bg-sky-900/20",
        },
        {
          icon: "users",
          title: "Live Interaction",
          description: "Q&A and helpful discussions.",
          gradient: "from-emerald-500 to-teal-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          icon: "trophy",
          title: "Better Results",
          description: "Focus on gaps and level up.",
          gradient: "from-fuchsia-500 to-rose-400",
          bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
        },
      ],
      ctaPrimaryLabel: "Browse institutions",
      ctaTertiaryLabel: "Browse School Exams",

      ctaSecondaryLabel: "Explore exams",
      searchPlaceholder: "Search exams, courses, or institutions...",
    },
  },
};

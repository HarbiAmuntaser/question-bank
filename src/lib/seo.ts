// ============================================================================
// file: src/lib/seo.ts
// أدوات SEO/OG/JSON-LD + جلب SeoMeta
// ============================================================================

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

/** اسم الموقع الافتراضي */
export const SITE_NAME = "بنك الأسئلة السعودي";
/** قاعدة الروابط (يفضّل ضبطها في .env.local) */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
  "https://bank.example.com";

/** تكوين Robots الافتراضي */
const DEFAULT_ROBOTS = {
  index: true,
  follow: true,
  nocache: false,
  googleBot: {
    index: true,
    follow: true,
  },
} as const;

/** Metadata افتراضي شامل (يُستخدم على مستوى التطبيق) */
export function baseMetadata(): Metadata {
  const title = `${SITE_NAME} - منصة تعليمية سعودية`;
  const description =
    "منصة سعودية تجمع أسئلة واختبارات الجامعات والتخصصات مع تحليلات تقدم وتجربة استخدام سريعة وآمنة.";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
    keywords: [
      "بنك الأسئلة",
      "جامعات السعودية",
      "اختبارات",
      "أسئلة",
      "تعليم",
      "طلاب",
      "Saudi Universities",
      "Quizzes",
    ],
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      title,
      description,
      locale: "ar_SA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@saudibank",
    },
    robots: DEFAULT_ROBOTS,
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
      other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0ea5a4" }],
    },
    category: "education",
    referrer: "strict-origin-when-cross-origin",
  };
}

/** JSON-LD: كيان المؤسسة */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://x.com/saudibank",
      "https://www.facebook.com/saudibank",
      "https://www.instagram.com/saudibank",
      "https://www.youtube.com/@saudibank",
    ],
  };
}

/** JSON-LD: WebSite + SearchAction (لتحسين Sitelinks) */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/quizzes?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// ====== SeoMeta جلب حسب slug/locale (للاستخدام بالصفحات) ======
export type SeoMetaRecord = {
  slug: string;
  locale: "ar" | "en";
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
};

export async function getSeoBySlug(
  slug: string,
  locale: "ar" | "en" = "ar"
): Promise<SeoMetaRecord | null> {
  const row = await prisma.seoMeta.findFirst({
    where: { slug, locale },
    select: {
      slug: true,
      locale: true,
      metaTitle: true,
      metaDescription: true,
      ogTitle: true,
      ogDescription: true,
      ogImageUrl: true,
      canonicalUrl: true,
      noindex: true,
      nofollow: true,
    },
  });

  return row
    ? (row as SeoMetaRecord)
    : null;
}

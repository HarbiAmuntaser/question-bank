import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  formatArabicList,
  getEnabledPublicTypeLabels,
  schoolEnabled,
} from "@/config/public-features";

export const SITE_NAME = "مستواك";
export const SITE_DOMAIN = "mustawak.com";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
  `https://${SITE_DOMAIN}`;

export function stripSiteNameFromTitle(value: string | null | undefined) {
  const title = value?.trim() ?? "";
  if (!title) return "";

  const suffixes = [` | ${SITE_NAME}`, `| ${SITE_NAME}`, ` - ${SITE_NAME}`, `- ${SITE_NAME}`];
  for (const suffix of suffixes) {
    if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim();
  }

  const prefixes = [`${SITE_NAME} | `, `${SITE_NAME}|`, `${SITE_NAME} - `, `${SITE_NAME}-`];
  for (const prefix of prefixes) {
    if (title.startsWith(prefix)) return title.slice(prefix.length).trim();
  }

  return title;
}

export function withSiteName(value: string) {
  const title = stripSiteNameFromTitle(value);
  return title && title !== SITE_NAME ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

const SITE_DESCRIPTION = `مستواك منصة تعليمية عربية للتدريب والمراجعة عبر اختبارات وملخصات منظمة ضمن ${formatArabicList(
  getEnabledPublicTypeLabels(),
)}.`;
const BRAND_ICON = "/brand/mustawak-favicon-32.png";
const BRAND_APPLE_ICON = "/brand/mustawak-apple-touch-icon.png";
const BRAND_LOGO = "/brand/mustawak-og.png";

const DEFAULT_ROBOTS = {
  index: true,
  follow: true,
  nocache: false,
  googleBot: {
    index: true,
    follow: true,
  },
} as const;

export function baseMetadata(): Metadata {
  const title = `${SITE_NAME} - منصة تعليمية للاختبارات والمراجعة`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      "مستواك",
      "اختبارات تعليمية",
      "أسئلة تدريبية",
      "مراجعة دراسية",
      "اختبارات جامعية",
      ...(schoolEnabled ? ["اختبارات مدرسية"] : []),
      "منصة تعليمية عربية",
      "Quizzes",
      "Education",
    ],
    alternates: {
      canonical: SITE_URL,
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      title,
      description: SITE_DESCRIPTION,
      locale: "ar",
      images: [
        {
          url: BRAND_LOGO,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SITE_DESCRIPTION,
      images: [BRAND_LOGO],
    },
    robots: DEFAULT_ROBOTS,
    icons: {
      icon: [{ url: BRAND_ICON, type: "image/png", sizes: "32x32" }],
      shortcut: [{ url: BRAND_ICON, type: "image/png", sizes: "32x32" }],
      apple: [{ url: BRAND_APPLE_ICON, type: "image/png", sizes: "180x180" }],
    },
    category: "education",
    referrer: "strict-origin-when-cross-origin",
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${BRAND_LOGO}`,
  };
}

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

export async function getSeoBySlug(slug: string, locale: "ar" | "en" = "ar"): Promise<SeoMetaRecord | null> {
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

  return row ? (row as SeoMetaRecord) : null;
}

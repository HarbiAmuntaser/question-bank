/* Fixed Next 15 params typing */

// file: src/app/[cc]/page.tsx
/**
 * الصفحة الرئيسية حسب الدولة فقط
 * المسار: /{cc}
 *
 * - HeroSection حسب الدولة
 * - 3 أقسام Preview:
 *   1) جامعات (type=university)
 *   2) مدارس  (type=school)
 *   3) أكاديميات (type=academy)
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { HeroSection } from "@/components/public/hero-section/hero-section";
import {
  InstitutionsPreviewSection,
  type UniversityPreviewItem,
} from "@/components/public/home-main/institutions-preview";
import { HowItWorksSection } from "@/components/public/home-main/how-it-works-section";
import { PathSelectionSection } from "@/components/public/home-main/path-selection-section";
import {
  PlatformStatsSection,
  type PlatformStatsSnapshot,
} from "@/components/public/home-main/platform-stats-section";

import { SUPPORTED_COUNTRIES, type CountryCode } from "@/config/regions";
import { CACHE_TAGS, cacheTags } from "@/lib/cache-tags";
import { fetchJSON } from "@/lib/server/student-fetch";
import { SITE_NAME, SITE_URL, withSiteName } from "@/lib/seo";

type PageParams = { cc: string };
type PreviewType = "university" | "school" | "academy";

/** توحيد cc والتحقق أنه مدعوم */
function normalizeAndValidateCc(raw: string): CountryCode | null {
  const cc = (raw ?? "").trim().toUpperCase() as CountryCode;
  return SUPPORTED_COUNTRIES[cc] ? cc : null;
}

async function fetchPreviewItems(cc: CountryCode, type: PreviewType) {
  const params = new URLSearchParams({
    cc,
    type,
    limit: "3",
    withMajors: "1",
    sort: "popular",
  });

  try {
    const result = await fetchJSON<UniversityPreviewItem[]>(
      `/api/v1/student/universities?${params.toString()}`,
      {
        next: {
          tags: cacheTags(
            "student-universities",
            CACHE_TAGS.public.institutions,
            CACHE_TAGS.public.institutionsCountry(cc),
          ),
        },
      },
      600,
    );

    return result.ok && Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}

async function fetchPlatformStats() {
  try {
    const result = await fetchJSON<PlatformStatsSnapshot>(
      "/api/v1/student/stats",
      {
        next: {
          tags: cacheTags("student-stats", CACHE_TAGS.public.stats),
        },
      },
      600,
    );

    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { cc: rawCc } = await params;
  const cc = normalizeAndValidateCc(rawCc);

  if (!cc) {
    return { title: "Not Found", robots: { index: false, follow: false } };
  }

  const countryLabel = SUPPORTED_COUNTRIES[cc].label;
  const canonical = `${SITE_URL}/${cc}`;
  const title = countryLabel;
  const socialTitle = withSiteName(title);
  const description = `${SITE_NAME} منصة تعليمية وتدريبية تساعدك على الوصول إلى المحتوى المناسب حسب الدولة والجهة التعليمية.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: "ar",
    },
    robots: { index: true, follow: true },
    metadataBase: new URL(SITE_URL),
  };
}

export default async function CountryHome({ params }: { params: Promise<PageParams> }) {
  const { cc: rawCc } = await params;
  const cc = normalizeAndValidateCc(rawCc);

  if (!cc) notFound();

  const [universities, platformStats] = await Promise.all([
    fetchPreviewItems(cc, "university"),
    fetchPlatformStats(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main>
        {/* Hero حسب الدولة فقط */}
        <HeroSection cc={cc} lang="ar" />

        <PathSelectionSection cc={cc} />
        <PlatformStatsSection stats={platformStats} />
        <HowItWorksSection />
        <InstitutionsPreviewSection cc={cc} type="university" initialItems={universities} />
      </main>

      <PublicFooter cc={cc} />
    </div>
  );
}

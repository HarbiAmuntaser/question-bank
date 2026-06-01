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

import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { HeroSection } from "@/components/public/hero-section/hero-section";
import {
  InstitutionsPreviewSection,
  StaticInstitutionsPreviewSection,
  ViewportInstitutionsPreviewSection,
  type UniversityPreviewItem,
} from "@/components/public/home-main/institutions-preview";

import { SUPPORTED_COUNTRIES, type CountryCode } from "@/config/regions";
import { fetchJSON } from "@/lib/server/student-fetch";

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
      undefined,
      600,
    );

    return result.ok && Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}

export default async function CountryHome({ params }: { params: Promise<PageParams> }) {
  const { cc: rawCc } = await params;
  const cc = normalizeAndValidateCc(rawCc);

  if (!cc) notFound();

  const [universities, schools, academies] = await Promise.all([
    fetchPreviewItems(cc, "university"),
    fetchPreviewItems(cc, "school"),
    fetchPreviewItems(cc, "academy"),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main>
        {/* Hero حسب الدولة فقط */}
        <HeroSection cc={cc} lang="ar" />

        {/* ✅ Preview Sections */}
        <InstitutionsPreviewSection cc={cc} type="university" initialItems={universities} />
        <ViewportInstitutionsPreviewSection cc={cc} type="school" initialItems={schools}>
          <StaticInstitutionsPreviewSection cc={cc} type="school" initialItems={schools} />
        </ViewportInstitutionsPreviewSection>

        <ViewportInstitutionsPreviewSection cc={cc} type="academy" initialItems={academies}>
          <StaticInstitutionsPreviewSection cc={cc} type="academy" initialItems={academies} />
        </ViewportInstitutionsPreviewSection>
      </main>

      <PublicFooter cc={cc} />
    </div>
  );
}

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
import { InstitutionsPreviewSection } from "@/components/public/home-main/institutions-preview";

import { SUPPORTED_COUNTRIES, type CountryCode } from "@/config/regions";

type PageParams = { cc: string };

/** توحيد cc والتحقق أنه مدعوم */
function normalizeAndValidateCc(raw: string): CountryCode | null {
  const cc = (raw ?? "").trim().toUpperCase() as CountryCode;
  return SUPPORTED_COUNTRIES[cc] ? cc : null;
}

export default async function CountryHome({ params }: { params: Promise<PageParams> }) {
  const { cc: rawCc } = await params;
  const cc = normalizeAndValidateCc(rawCc);

  if (!cc) notFound();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main>
        {/* Hero حسب الدولة فقط */}
        <HeroSection cc={cc} lang="ar" />

        {/* ✅ Preview Sections */}
        <InstitutionsPreviewSection cc={cc} type="university" />
        <InstitutionsPreviewSection cc={cc} type="school" />
        <InstitutionsPreviewSection cc={cc} type="academy" />
      </main>

      <PublicFooter cc={cc} />
    </div>
  );
}

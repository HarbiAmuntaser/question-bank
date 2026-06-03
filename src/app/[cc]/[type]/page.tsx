// file: src/app/[cc]/[type]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer";

import { normalizeCountry, isSupportedType } from "@/lib/route-helpers";
import type { CountryCode, InstitutionType } from "@/config/regions";
import { UniversityGrid } from "@/components/public/university-grid/university-grid";
import type { UniversityGridItem } from "@/components/public/university-grid/types";
import { fetchJSON } from "@/lib/server/student-fetch";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// ISR للصفحة نفسها (الواجهة) — محتوى الشبكة يجلب Client-side
export const revalidate = 3600;

type PageParams = {
  cc: string;
  type: string;
};

/**
 * ✅ Next 15:
 * params في App Router تأتي Promise
 */
function typeLabel(type: InstitutionType) {
  switch (type) {
    case "school":
      return "المدارس";
    case "academy":
      return "الأكاديميات";
    default:
      return "الجامعات";
  }
}

function localeFor(cc: CountryCode) {
  return cc === "YE" ? "ar_YE" : "ar_SA";
}

async function fetchInitialInstitutions(cc: CountryCode, type: InstitutionType) {
  const params = new URLSearchParams({
    limit: "200",
    withMajors: "0",
    cc,
    type,
    sort: "name",
  });

  try {
    const result = await fetchJSON<UniversityGridItem[]>(
      `/api/v1/student/universities?${params.toString()}`,
      undefined,
      600,
    );

    return result.ok && Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const p = await params; // ✅ Next 15

  const cc = normalizeCountry(p.cc) as CountryCode;
  const typeRaw = (p.type || "").toLowerCase();

  if (!isSupportedType(typeRaw, cc)) {
    return { title: "Not Found" };
  }

  const type = typeRaw as InstitutionType;

  const title = `${typeLabel(type)} في ${cc === "YE" ? "اليمن" : "السعودية"} | ${SITE_NAME}`;
  const description =
    type === "university"
      ? "استكشف جميع الجامعات، التخصصات والمقررات، وابدأ التحضير عبر مكتبة الاختبارات."
      : type === "school"
        ? "استكشف المدارس والمحتوى التعليمي حسب الدولة، وتصفح التخصصات والمواد."
        : "استكشف الأكاديميات والمحتوى التدريبي حسب الدولة، وتصفح المسارات التعليمية.";

  const canonical = `${SITE_URL}/${cc}/${type}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: localeFor(cc),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
    metadataBase: new URL(SITE_URL),
  };
}

export default async function TypeListPage({ params }: { params: Promise<PageParams> }) {
  const p = await params; // ✅ Next 15

  const cc = normalizeCountry(p.cc) as CountryCode;
  const typeRaw = (p.type || "").toLowerCase();

  if (!isSupportedType(typeRaw, cc)) {
    notFound();
  }

  const type = typeRaw as InstitutionType;
  const initialItems = await fetchInitialInstitutions(cc, type);

  // Breadcrumb JSON-LD (بدون any)
  const breadcrumbJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "الصفحة الرئيسية",
        item: `${SITE_URL}/${cc}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: typeLabel(type),
        item: `${SITE_URL}/${cc}/${type}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <PublicHeader />

      <main>
        <section className="container py-10">
          <UniversityGrid cc={cc} type={type} lang="ar" initialItems={initialItems} showViewAll={false} showSearch />
        </section>
      </main>

      <PublicFooter cc={cc} />
    </div>
  );
}

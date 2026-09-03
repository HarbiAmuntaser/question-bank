// file: src/app/[cc]/[type]/majors/[...slug]/page.tsx

import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

import { normalizeCountry, isSupportedType } from "@/lib/route-helpers";
import type { InstitutionType } from "@/config/regions";
import { getPublicMajorByRouteKey } from "@/lib/server/public-education-loaders";

export const revalidate = 21600;

/**
 * ✅ Next 15:
 * params في App Router تأتي كـ Promise
 */
type PageParams = { cc: string; type: string; slug: string[] };

/** تنظيف أجزاء slug وتحويلها لمسار واحد */
function normalizeSlugParts(parts: string[] | undefined) {
  const clean = (parts ?? [])
    .map((p) => {
      try {
        return decodeURIComponent(p).trim();
      } catch {
        // لو كان فيه encoding خاطئ، لا نكسر الصفحة
        return String(p).trim();
      }
    })
    .filter(Boolean);

  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "").replace(/\s*\/\s*/g, "/");
  const last = clean[clean.length - 1] ?? slugPath;

  return { slugPath, last };
}

/** إزالة بادئة عربية من slug مثل "تخصصات/" */
function stripPrefix(raw: string, prefixAr: string) {
  return (raw || "")
    .trim()
    .replace(new RegExp(`^${prefixAr}\\s*\\/\\s*`, "u"), "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

/** ترميز slug متعدد المقاطع بأمان */
function encodeSlugPath(slugPath: string) {
  return (slugPath || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

type MajorLite = {
  seo?: { slug: string | null };
  university: { seo?: { slug: string | null }; code: string | null; id: string };
};

/**
 * جلب تخصص عبر slug أو code
 * - أولاً by-slug
 * - ثم fallback إلى by-code إذا كان segment واحد
 */
async function fetchMajorBySlugOrCode(slugPathRaw: string): Promise<MajorLite | null> {
  const slugPath = stripPrefix(slugPathRaw, "تخصصات");
  return getPublicMajorByRouteKey(slugPath);
}

/**
 * Metadata: هذه صفحة Legacy هدفها redirect فقط
 * لذلك نجعلها noindex
 */
export async function generateMetadata(_: { params: Promise<PageParams> }): Promise<Metadata> {
  return { title: "تحويل...", robots: { index: false, follow: false } };
}

/**
 * صفحة تحويل قديمة:
 * /{cc}/{type}/majors/...  ->  /{cc}/{type}/universities/{uni}/majors/{major}
 */
export default async function LegacyMajorRedirectPage({ params }: { params: Promise<PageParams> }) {
  const p = await params; // ✅ Next 15

  const cc = normalizeCountry(p.cc);
  const typeRaw = (p.type || "").toLowerCase();
  if (!isSupportedType(typeRaw, cc)) notFound();
  const type = typeRaw as InstitutionType;

  const { slugPath } = normalizeSlugParts(p.slug);

  const major = await fetchMajorBySlugOrCode(slugPath);
  if (!major) notFound();

  const canonicalMajor = stripPrefix(major.seo?.slug || slugPath, "تخصصات");
  const canonicalUni = stripPrefix(
    major.university?.seo?.slug || major.university?.code || major.university?.id || "",
    "جامعات"
  );

  const target =
    `/${cc}/${type}` +
    `/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}`;

  permanentRedirect(target);
}

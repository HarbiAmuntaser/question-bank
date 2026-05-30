// file: src/app/[cc]/[type]/majors/[...slug]/page.tsx

import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { normalizeCountry, isSupportedType } from "@/lib/route-helpers";
import type { InstitutionType } from "@/config/regions";

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

/**
 * بناء base URL من headers (يعمل على Vercel + محليًا)
 * - على Vercel: x-forwarded-proto / x-forwarded-host موجودة
 * - محليًا: fallback إلى localhost:3000
 */
async function apiBase() {
  const h = await headers(); // ✅ لازم await في Next 15
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Fetch JSON helper (بدون any)
 * - يدعم شكل الاستجابة { data: T }
 */
type NextFetchInit = RequestInit & { next?: { revalidate?: number } };

function hasData<T>(x: unknown): x is { data: T } {
  return typeof x === "object" && x !== null && "data" in x;
}

async function fetchJSON<T>(url: string, init?: NextFetchInit) {
  const base = await apiBase(); // ✅
  const abs = url.startsWith("http") ? url : `${base}${url}`;

  // نحافظ على revalidate الافتراضي ونسمح بتخصيصه من init.next
  const res = await fetch(abs, {
    ...init,
    next: { revalidate: 21600, ...(init?.next ?? {}) },
  });

  if (!res.ok) return { ok: false as const, status: res.status, data: null as T | null };

  const json: unknown = await res.json().catch(() => null);
  const data = hasData<T>(json) ? json.data : null;

  return { ok: true as const, status: res.status, data };
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
async function fetchMajorBySlugOrCode(slugPathRaw: string) {
  const slugPath = stripPrefix(slugPathRaw, "تخصصات");

  const bySlug = await fetchJSON<MajorLite>(
    `/api/v1/student/majors/by-slug/${encodeURIComponent(slugPath)}`
  );
  if (bySlug.ok && bySlug.data) return bySlug.data;

  if (!slugPath.includes("/")) {
    const byCode = await fetchJSON<MajorLite>(
      `/api/v1/student/majors/by-code/${encodeURIComponent(slugPath)}`
    );
    if (byCode.ok && byCode.data) return byCode.data;
  }

  return null;
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

// file: src/app/[cc]/[type]/subjects/[...slug]/page.tsx

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { normalizeCountry, isSupportedType } from "@/lib/route-helpers";
import type { InstitutionType } from "@/config/regions";
import {
  normalizeSegments,
  joinSlug,
  stripPrefix,
  encodeSlugPath,
} from "@/lib/public/slug-utils";
import { getPublicSubjectByRouteKey } from "@/lib/server/public-education-loaders";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "تحويل...",
  robots: { index: false, follow: false },
};

/**
 * ✅ Next 15:
 * params تأتي Promise
 */
type PageParams = { cc: string; type: string; slug: string[] };

/**
 * أقل نوع ممكن نحتاجه هنا:
 * فقط المسارات اللازمة للـ redirect
 */
type SubjectLite = {
  id: string;
  code: string | null;
  seo?: { slug: string | null };
  major?: {
    id: string;
    code: string | null;
    seo?: { slug: string | null };
    university?: {
      id: string;
      code: string | null;
      seo?: { slug: string | null };
      countryCode: string | null;
      institutionType: string | null;
      visibility?: "country" | "global" | null;
    };
  };
};

async function fetchSubjectBySlugOrCodeOrId(
  subjectSlugPathRaw: string,
): Promise<SubjectLite | null> {
  const subjectSlugPath = stripPrefix(subjectSlugPathRaw, "مواد");
  return getPublicSubjectByRouteKey(subjectSlugPath);
}

/**
 * صفحة توافق قديمة:
 * /{cc}/{type}/subjects/...  ->  redirect إلى المسار الهرمي الجديد داخل universities/majors/subjects
 */
export default async function SubjectCompatPage({ params }: { params: Promise<PageParams> }) {
  const p = await params; // ✅ Next 15

  const cc = normalizeCountry(p.cc);
  const typeRaw = (p.type || "").toLowerCase();
  if (!isSupportedType(typeRaw, cc)) notFound();
  const type = typeRaw as InstitutionType;

  const segs = normalizeSegments(p.slug);
  const subjectSlugPath = joinSlug(segs);
  if (!subjectSlugPath) notFound();

  const subject = await fetchSubjectBySlugOrCodeOrId(subjectSlugPath);
  if (!subject) notFound();

  const uniSlug = stripPrefix(
    subject?.major?.university?.seo?.slug ||
      subject?.major?.university?.code ||
      subject?.major?.university?.id ||
      "",
    "جامعات"
  );

  const majorSlug = stripPrefix(
    subject?.major?.seo?.slug || subject?.major?.code || subject?.major?.id || "",
    "تخصصات"
  );

  const subSlug = stripPrefix(
    subject?.seo?.slug || subject?.code || subject?.id,
    "مواد"
  );

  // لو البيانات تحمل cc/type مختلفة → نستخدمها
  const realCC = (subject?.major?.university?.countryCode || cc).toUpperCase();
  const realType = (
    subject?.major?.university?.institutionType || type
  ).toLowerCase();
  const isGlobalAcademy = realType === "academy" && subject?.major?.university?.visibility === "global";

  redirect(
    `/${isGlobalAcademy ? cc : realCC}/${realType}` +
      `/universities/${encodeSlugPath(uniSlug)}` +
      `/majors/${encodeSlugPath(majorSlug)}` +
      `/subjects/${encodeSlugPath(subSlug)}`
  );
}

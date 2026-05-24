// file: src/app/[cc]/[type]/subjects/[...slug]/page.tsx

import { notFound, redirect } from "next/navigation";
import { normalizeCountry, isSupportedType } from "@/lib/route-helpers";
import type { InstitutionType } from "@/config/regions";
import {
  normalizeSegments,
  joinSlug,
  stripPrefix,
  encodeSlugPath,
} from "@/lib/public/slug-utils";
import { fetchJSON } from "@/lib/server/student-fetch";

export const revalidate = 300;

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
    };
  };
};

async function fetchSubjectBySlugOrCodeOrId(subjectSlugPathRaw: string) {
  const subjectSlugPath = stripPrefix(subjectSlugPathRaw, "مواد");

  // 1) by-slug
  const bySlug = await fetchJSON<SubjectLite>(
    `/api/v1/student/subjects/by-slug/${encodeSlugPath(subjectSlugPath)}`
  );
  if (bySlug.ok && bySlug.data) return bySlug.data;

  // 2) fallback: by-code ثم by-id (إذا segment واحد)
  if (!subjectSlugPath.includes("/")) {
    const byCode = await fetchJSON<SubjectLite>(
      `/api/v1/student/subjects/by-code/${encodeURIComponent(subjectSlugPath)}`
    );
    if (byCode.ok && byCode.data) return byCode.data;

    const byId = await fetchJSON<SubjectLite>(
      `/api/v1/student/subjects/by-id/${encodeURIComponent(subjectSlugPath)}`
    );
    if (byId.ok && byId.data) return byId.data;
  }

  return null;
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

  redirect(
    `/${realCC}/${realType}` +
      `/universities/${encodeSlugPath(uniSlug)}` +
      `/majors/${encodeSlugPath(majorSlug)}` +
      `/subjects/${encodeSlugPath(subSlug)}`
  );
}

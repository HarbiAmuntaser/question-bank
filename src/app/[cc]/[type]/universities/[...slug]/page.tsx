/* Fixed Next 15 params typing */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { UniversityHero } from "@/components/public/university-hero";
import { MajorsList } from "@/components/public/majors-list";
import { UniversityDegreeSelector } from "@/components/public/university-degree-selector";
import { MajorDetails } from "@/components/public/major-details";
import { SubjectDetails } from "@/components/public/subject-details";
import { QuizDetails } from "@/components/public/quiz-details";
import { StudySummaryDetails } from "@/components/public/study-summaries/study-summary-details";
import type { MajorPublicLite, UniversityPublicLite } from "@/types/public-university";

import { normalizeCountry, isSupportedType } from "@/lib/route-helpers";
import type { InstitutionType } from "@/config/regions";

import {
  normalizeSegments,
  joinSlug,
  stripPrefix,
  encodeSlugPath,
  findIndexCI,
} from "@/lib/public/slug-utils";

import { CACHE_TAGS, cacheTags } from "@/lib/cache-tags";
import { fetchJSON } from "@/lib/server/student-fetch";
import { getPublishedSubjectSummaryBySlug, getStudySummarySeoMeta } from "@/lib/server/study-summaries";
import { SITE_NAME, SITE_URL, stripSiteNameFromTitle, withSiteName } from "@/lib/seo";
import { educationPageRobots } from "@/lib/search-indexing";
import { DEGREE_TYPE_OPTIONS, normalizeDegreeType, type DegreeTypeValue } from "@/lib/degree-types";

export const revalidate = 21600;

type PageParams = { cc: string; type: string; slug: string[] };
type PageSearchParams = { degree?: string | string[] };

function getFirstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildDegreeGroups(majors: MajorPublicLite[]) {
  const counts = new Map<DegreeTypeValue, number>();

  for (const major of majors) {
    const degree = normalizeDegreeType(major.degreeType);
    counts.set(degree, (counts.get(degree) ?? 0) + 1);
  }

  return DEGREE_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    count: counts.get(option.value) ?? 0,
  })).filter((group) => group.count > 0);
}

/* -------------------------
   Minimal Types (بدون any)
------------------------- */
type SeoMeta = {
  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  noindex?: boolean | null;
  nofollow?: boolean | null;
};

type University = {
  id: string;
  name: string;
  code?: string | null;
  logoUrl?: string | null;
  countryCode?: string | null;
  institutionType?: string | null;
  seo?: { slug?: string | null } | null;
  majors?: unknown[];
};

type Major = {
  id: string;
  name: string;
  seo?: { slug?: string | null } | null;
  university?: University | null;
};

type Subject = {
  id: string;
  name: string;
  seo?: { slug?: string | null } | null;
  major?: Major | null;
};

type QuizPreview = {
  id: string;
  title: string;
  description?: string | null;
  seo?: { slug?: string | null } | null;
  context?: {
    university?: University | null;
    major?: Major | null;
    subject?: Subject | null;
  } | null;
};

// -------------------------
// Helpers (Universities / Majors / Subjects / Quizzes)
// -------------------------

async function fetchUniversityBySlugOrCode(slugPathRaw: string): Promise<{ uni: University | null }> {
  const slugPath = stripPrefix(slugPathRaw, "جامعات");
  const bySlug = await fetchJSON<University>(
    `/api/v1/student/universities/by-slug/${encodeSlugPath(slugPath)}`,
    { cache: "no-store" },
    0
  );
  if (bySlug.ok && bySlug.data) return { uni: bySlug.data };

  if (!slugPath.includes("/")) {
    const byCode = await fetchJSON<University>(
      `/api/v1/student/universities/by-code/${encodeURIComponent(slugPath)}`,
      { cache: "no-store" },
      0
    );
    if (byCode.ok && byCode.data) return { uni: byCode.data };
  }

  return { uni: null };
}

async function getSeoForUniversitySlug(slugPathRaw: string): Promise<SeoMeta | null> {
  const slugPath = stripPrefix(slugPathRaw, "جامعات");
  const r = await fetchJSON<SeoMeta>(
    `/api/v1/student/seo/university/${encodeSlugPath(slugPath)}`,
    {
      next: {
        tags: cacheTags("student-university-detail", CACHE_TAGS.public.seo, CACHE_TAGS.public.institutions),
      },
    },
    21600
  );
  return r.ok ? r.data : null;
}

async function fetchMajorBySlugOrCode(majorSlugPathRaw: string): Promise<{ major: Major | null }> {
  const majorSlugPath = stripPrefix(majorSlugPathRaw, "تخصصات");
  const tags = cacheTags(
    "student-majors",
    "student-major-detail",
    "student-subjects",
    CACHE_TAGS.public.majors,
    CACHE_TAGS.public.subjects,
    CACHE_TAGS.public.quizzes,
    CACHE_TAGS.public.seo,
  );

  const bySlug = await fetchJSON<Major>(
    `/api/v1/student/majors/by-slug/${encodeSlugPath(majorSlugPath)}`,
    { next: { tags } },
    21600
  );
  if (bySlug.ok && bySlug.data) return { major: bySlug.data };

  if (!majorSlugPath.includes("/")) {
    const byCode = await fetchJSON<Major>(
      `/api/v1/student/majors/by-code/${encodeURIComponent(majorSlugPath)}`,
      { next: { tags } },
      21600
    );
    if (byCode.ok && byCode.data) return { major: byCode.data };

    const byId = await fetchJSON<Major>(
      `/api/v1/student/majors/by-id/${encodeURIComponent(majorSlugPath)}`,
      { next: { tags } },
      21600
    );
    if (byId.ok && byId.data) return { major: byId.data };
  }

  return { major: null };
}

async function fetchSubjectBySlugOrCode(subjectSlugPathRaw: string): Promise<{ subject: Subject | null }> {
  const subjectSlugPath = stripPrefix(subjectSlugPathRaw, "مواد");
  const tags = cacheTags(
    "student-subjects",
    "student-subject-detail",
    "student-quizzes",
    "student-quizzes-by-subject",
    CACHE_TAGS.public.subjects,
    CACHE_TAGS.public.quizzes,
    CACHE_TAGS.public.seo,
  );

  const bySlug = await fetchJSON<Subject>(
    `/api/v1/student/subjects/by-slug/${encodeSlugPath(subjectSlugPath)}`,
    { next: { tags } },
    21600
  );
  if (bySlug.ok && bySlug.data) return { subject: bySlug.data };

  if (!subjectSlugPath.includes("/")) {
    const byCode = await fetchJSON<Subject>(
      `/api/v1/student/subjects/by-code/${encodeURIComponent(subjectSlugPath)}`,
      { next: { tags } },
      21600
    );
    if (byCode.ok && byCode.data) return { subject: byCode.data };
  }

  return { subject: null };
}

async function getSeoForSubjectSlug(subjectSlugPathRaw: string): Promise<SeoMeta | null> {
  const subjectSlugPath = stripPrefix(subjectSlugPathRaw, "مواد");
  const r = await fetchJSON<SeoMeta>(
    `/api/v1/student/seo/subject/${encodeSlugPath(subjectSlugPath)}`,
    {
      next: {
        tags: cacheTags("student-subject-detail", CACHE_TAGS.public.seo, CACHE_TAGS.public.subjects),
      },
    },
    21600
  );
  return r.ok ? r.data : null;
}

async function fetchQuizPreviewBySlugOrId(quizSlugPathRaw: string): Promise<{ quiz: QuizPreview | null }> {
  const quizSlugPath = stripPrefix(quizSlugPathRaw, "اختبارات");

  const bySlug = await fetchJSON<QuizPreview>(
    `/api/v1/student/quizzes/preview/by-slug/${encodeSlugPath(quizSlugPath)}`,
    { cache: "no-store" },
    0
  );
  if (bySlug.ok && bySlug.data) return { quiz: bySlug.data };

  if (!quizSlugPath.includes("/")) {
    const byId = await fetchJSON<QuizPreview>(
      `/api/v1/student/quizzes/preview/by-id/${encodeURIComponent(quizSlugPath)}`,
      { cache: "no-store" },
      0
    );
    if (byId.ok && byId.data) return { quiz: byId.data };
  }

  return { quiz: null };
}

async function getSeoForQuizSlug(quizSlugPathRaw: string): Promise<SeoMeta | null> {
  const quizSlugPath = stripPrefix(quizSlugPathRaw, "اختبارات");
  const r = await fetchJSON<SeoMeta>(
    `/api/v1/student/seo/quiz/${encodeSlugPath(quizSlugPath)}`,
    { cache: "no-store" },
    0
  );
  return r.ok ? r.data : null;
}

// -------------------------
// Route Parser
// -------------------------

function parseUniversitiesCatchAll(segs: string[]) {
  const majorsIdx = findIndexCI(segs, "majors");
  const subjectsIdx = findIndexCI(segs, "subjects");
  const quizzesIdx = findIndexCI(segs, "quizzes");
  const summariesIdx = findIndexCI(segs, "summaries");

  if (majorsIdx < 0) {
    return {
      kind: "university" as const,
      universitySlugPath: joinSlug(segs),
      majorSlugPath: "",
      subjectSlugPath: "",
      quizSlugPath: "",
    };
  }

  if (subjectsIdx < 0) {
    return {
      kind: "major" as const,
      universitySlugPath: joinSlug(segs.slice(0, majorsIdx)),
      majorSlugPath: joinSlug(segs.slice(majorsIdx + 1)),
      subjectSlugPath: "",
      quizSlugPath: "",
    };
  }

  if (quizzesIdx > subjectsIdx) {
    return {
      kind: "quiz" as const,
      universitySlugPath: joinSlug(segs.slice(0, majorsIdx)),
      majorSlugPath: joinSlug(segs.slice(majorsIdx + 1, subjectsIdx)),
      subjectSlugPath: joinSlug(segs.slice(subjectsIdx + 1, quizzesIdx)),
      quizSlugPath: joinSlug(segs.slice(quizzesIdx + 1)),
    };
  }

  if (summariesIdx > subjectsIdx) {
    return {
      kind: "summary" as const,
      universitySlugPath: joinSlug(segs.slice(0, majorsIdx)),
      majorSlugPath: joinSlug(segs.slice(majorsIdx + 1, subjectsIdx)),
      subjectSlugPath: joinSlug(segs.slice(subjectsIdx + 1, summariesIdx)),
      summarySlugPath: joinSlug(segs.slice(summariesIdx + 1)),
      quizSlugPath: "",
    };
  }

  return {
    kind: "subject" as const,
    universitySlugPath: joinSlug(segs.slice(0, majorsIdx)),
    majorSlugPath: joinSlug(segs.slice(majorsIdx + 1, subjectsIdx)),
    subjectSlugPath: joinSlug(segs.slice(subjectsIdx + 1)),
    summarySlugPath: "",
    quizSlugPath: "",
  };
}

// -------------------------
// Metadata
// -------------------------

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const p = await params;

  const cc = normalizeCountry(p.cc);
  const typeRaw = (p.type || "").toLowerCase();
  if (!isSupportedType(typeRaw, cc)) {
    return { title: "غير موجود", robots: { index: false, follow: false } };
  }
  const type = typeRaw as InstitutionType;

  const segs = normalizeSegments(p.slug);
  const parsed = parseUniversitiesCatchAll(segs);

  // ---- Quiz metadata ----
  if (parsed.kind === "quiz") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, quizSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath || !quizSlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const [{ quiz }, seo] = await Promise.all([
      fetchQuizPreviewBySlugOrId(quizSlugPath),
      getSeoForQuizSlug(quizSlugPath).catch(() => null),
    ]);

    if (!quiz?.context?.university || !quiz?.context?.major || !quiz?.context?.subject) {
      return { title: "اختبار غير موجود", robots: { index: false, follow: false } };
    }

    const canonicalUni = stripPrefix(quiz.context.university.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(quiz.context.major.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(quiz.context.subject.seo?.slug || subjectSlugPath, "مواد");
    const canonicalQuiz = stripPrefix(seo?.slug || quiz.seo?.slug || quizSlugPath, "اختبارات");

    const canonicalPath = `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
      canonicalMajor
    )}/subjects/${encodeSlugPath(canonicalSubject)}/quizzes/${encodeSlugPath(canonicalQuiz)}`;

    const canonical = `${SITE_URL}${canonicalPath}`;

    const title = stripSiteNameFromTitle(seo?.metaTitle) || quiz.title;
    const socialTitle = seo?.ogTitle || withSiteName(title);
    const description = seo?.metaDescription || quiz.description || `شاهد تفاصيل اختبار "${quiz.title}" ثم ابدأ.`;
    const ogImage = seo?.ogImageUrl || quiz.context.university.logoUrl || undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: socialTitle,
        description: seo?.ogDescription || description,
        images: ogImage ? [{ url: ogImage }] : undefined,
        type: "website",
        url: canonical,
      },
      robots: educationPageRobots(seo),
    };
  }

  // ---- Study summary metadata ----
  if (parsed.kind === "summary") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, summarySlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath || !summarySlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const { subject } = await fetchSubjectBySlugOrCode(subjectSlugPath);
    if (!subject) {
      return { title: "ملخص غير موجود", robots: { index: false, follow: false } };
    }

    const summary = await getPublishedSubjectSummaryBySlug(subject.id, stripPrefix(summarySlugPath, "ملخصات"));
    if (!summary) {
      return { title: "ملخص غير موجود", robots: { index: false, follow: false } };
    }

    const seo = await getStudySummarySeoMeta(summary.id).catch(() => null);
    const canonicalUni = stripPrefix(subject.major?.university?.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");
    const canonicalSummary = stripPrefix(summary.slug, "ملخصات");
    const canonicalPath = `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
      canonicalMajor,
    )}/subjects/${encodeSlugPath(canonicalSubject)}/summaries/${encodeSlugPath(canonicalSummary)}`;
    const canonical = `${SITE_URL}${canonicalPath}`;
    const title = stripSiteNameFromTitle(seo?.metaTitle) || summary.title;
    const socialTitle = seo?.ogTitle || withSiteName(title);
    const description =
      seo?.metaDescription || summary.excerpt || `اقرأ ملخص ${summary.title} ضمن مادة ${subject.name} على ${SITE_NAME}.`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: socialTitle,
        description: seo?.ogDescription || description,
        images: seo?.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
        type: "article",
        url: canonical,
      },
      robots: educationPageRobots(seo),
    };
  }

  // ---- Subject metadata ----
  if (parsed.kind === "subject") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const [{ subject }, seo] = await Promise.all([
      fetchSubjectBySlugOrCode(subjectSlugPath),
      getSeoForSubjectSlug(subjectSlugPath).catch(() => null),
    ]);

    if (!subject) {
      return { title: "مادة غير موجودة", robots: { index: false, follow: false } };
    }

    const canonicalUni = stripPrefix(subject.major?.university?.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");

    const canonicalPath = `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
      canonicalMajor
    )}/subjects/${encodeSlugPath(canonicalSubject)}`;

    const canonical = `${SITE_URL}${canonicalPath}`;

    const title = stripSiteNameFromTitle(seo?.metaTitle) || subject.name;
    const socialTitle = seo?.ogTitle || withSiteName(title);
    const description = seo?.metaDescription || `استكشف اختبارات مادة ${subject.name} ضمن ${SITE_NAME}.`;
    const ogImage = seo?.ogImageUrl || subject.major?.university?.logoUrl || undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: socialTitle,
        description: seo?.ogDescription || description,
        images: ogImage ? [{ url: ogImage }] : undefined,
        type: "website",
        url: canonical,
      },
      robots: educationPageRobots(seo),
    };
  }

  // ---- Major metadata ----
  if (parsed.kind === "major") {
    const { universitySlugPath, majorSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const { major } = await fetchMajorBySlugOrCode(majorSlugPath);
    if (!major) {
      return { title: "تخصص غير موجود", robots: { index: false, follow: false } };
    }

    const canonicalMajor = stripPrefix(major.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalUni = stripPrefix(major.university?.seo?.slug || universitySlugPath, "جامعات");

    const canonicalPath = `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
      canonicalMajor
    )}`;

    const canonical = `${SITE_URL}${canonicalPath}`;

    const title = major.name;
    const socialTitle = withSiteName(title);
    const description = `استكشف مواد تخصص ${major.name} واستعد للاختبارات.`;
    const ogImage = major.university?.logoUrl || undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: socialTitle,
        description,
        images: ogImage ? [{ url: ogImage }] : undefined,
        type: "website",
        url: canonical,
      },
      robots: educationPageRobots(),
    };
  }

  // ---- University metadata ----
  const slugPath = parsed.universitySlugPath;

  const [seo, uniRes] = await Promise.all([
    getSeoForUniversitySlug(slugPath).catch(() => null),
    fetchUniversityBySlugOrCode(slugPath),
  ]);

  const uni = uniRes.uni;

  if (!seo && !uni) {
    return { title: "غير موجود", robots: { index: false, follow: false } };
  }

  const canonicalSlug = stripPrefix(uni?.seo?.slug || slugPath, "جامعات");
  const canonicalPath = `/${cc}/${type}/universities/${encodeSlugPath(canonicalSlug)}`;
  const canonical = `${SITE_URL}${canonicalPath}`;

  const title = stripSiteNameFromTitle(seo?.metaTitle) || uni?.name || "جامعة";
  const socialTitle = seo?.ogTitle || withSiteName(title);
  const description = seo?.metaDescription || `استكشف التخصصات والمقررات والاختبارات المتاحة.`;
  const ogImage = seo?.ogImageUrl || uni?.logoUrl || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description: seo?.ogDescription || description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
      url: canonical,
    },
    robots: educationPageRobots(seo),
  };
}

// -------------------------
// Page
// -------------------------

export default async function UniversitiesCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [p, sp] = await Promise.all([params, searchParams]);

  const cc = normalizeCountry(p.cc);
  const typeRaw = (p.type || "").toLowerCase();
  if (!isSupportedType(typeRaw, cc)) notFound();
  const type = typeRaw as InstitutionType;

  const segs = normalizeSegments(p.slug);
  const parsed = parseUniversitiesCatchAll(segs);

  if (parsed.kind === "quiz") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, quizSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath || !quizSlugPath) notFound();

    return (
      <div className="flex flex-col min-h-screen">
        <PublicHeader />
        <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
          <QuizDetails
            cc={cc}
            type={type}
            universitySlugPath={universitySlugPath}
            majorSlugPath={majorSlugPath}
            subjectSlugPath={subjectSlugPath}
            quizSlugPath={quizSlugPath}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  if (parsed.kind === "summary") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, summarySlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath || !summarySlugPath) notFound();

    return (
      <div className="flex flex-col min-h-screen">
        <PublicHeader />
        <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
          <StudySummaryDetails
            cc={cc}
            type={type}
            universitySlugPath={universitySlugPath}
            majorSlugPath={majorSlugPath}
            subjectSlugPath={subjectSlugPath}
            summarySlugPath={summarySlugPath}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  if (parsed.kind === "subject") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath) notFound();

    return (
      <div className="flex flex-col min-h-screen">
        <PublicHeader />
        <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
          <SubjectDetails
            cc={cc}
            type={type}
            universitySlugPath={universitySlugPath}
            majorSlugPath={majorSlugPath}
            subjectSlugPath={subjectSlugPath}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  if (parsed.kind === "major") {
    const { universitySlugPath, majorSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath) notFound();

    return (
      <div className="flex flex-col min-h-screen">
        <PublicHeader />
        <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
          <MajorDetails
            cc={cc}
            type={type}
            universitySlugPath={universitySlugPath}
            majorSlugPath={majorSlugPath}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  // ---- University page ----
  const slugPath = parsed.universitySlugPath;
  const { uni } = await fetchUniversityBySlugOrCode(slugPath);
  if (!uni) notFound();

  const uniCC = (uni.countryCode || "").toUpperCase();
  const uniType = (uni.institutionType || "").toLowerCase();

  const canonicalSlugFromUni = uni.seo?.slug ?? null;
  const finalSlug = stripPrefix(canonicalSlugFromUni || slugPath, "جامعات");

  // mismatch → redirect للمسار الصحيح
  if (uniCC && uniType && (uniCC !== cc || uniType !== type)) {
    redirect(`/${uniCC}/${uniType}/universities/${encodeSlugPath(finalSlug)}`);
  }

  // slug ليس canonical → redirect داخل نفس cc/type
  const currentClean = stripPrefix(slugPath, "جامعات");
  if (canonicalSlugFromUni && stripPrefix(canonicalSlugFromUni, "جامعات") !== currentClean) {
    redirect(`/${cc}/${type}/universities/${encodeSlugPath(stripPrefix(canonicalSlugFromUni, "جامعات"))}`);
  }

  const baseSlug = (uni.seo?.slug ?? uni.code ?? uni.id).toString();
  const universitySlugForLinks = stripPrefix(baseSlug, "جامعات");
  const uniTyped = uni as UniversityPublicLite;
  const allMajors = uniTyped.majors ?? [];
  const isUniversityType = type === "university";
  const degreeGroups = isUniversityType ? buildDegreeGroups(allMajors) : [];
  const requestedDegreeRaw = getFirstSearchValue(sp.degree);
  const requestedDegree = requestedDegreeRaw ? normalizeDegreeType(requestedDegreeRaw) : null;
  const requestedDegreeAvailable = requestedDegree
    ? degreeGroups.some((group) => group.value === requestedDegree)
    : false;
  const selectedDegree =
    requestedDegree && requestedDegreeAvailable
      ? requestedDegree
      : degreeGroups.length === 1
        ? degreeGroups[0].value
        : null;
  const universityBasePath = `/${cc}/${type}/universities/${encodeSlugPath(universitySlugForLinks)}`;
  const visibleMajors =
    isUniversityType && selectedDegree
      ? allMajors.filter((major) => normalizeDegreeType(major.degreeType) === selectedDegree)
      : allMajors;

  if (isUniversityType && degreeGroups.length > 1 && !selectedDegree) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main>
          <UniversityDegreeSelector
            universityName={uniTyped.name}
            basePath={universityBasePath}
            groups={degreeGroups}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main>
        <UniversityHero university={uniTyped} />

        <section id="majors-section" className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 space-y-2 sm:mb-10">
              <h2 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">
                التخصصات المتاحة
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                اختر التخصص الذي تريد استكشافه
              </p>
            </div>

            <MajorsList
              cc={cc}
              type={type}
              universitySlug={universitySlugForLinks}
              majors={visibleMajors}
            />
          </div>
        </section>
      </main>
      <PublicFooter cc={cc} />
    </div>
  );
}

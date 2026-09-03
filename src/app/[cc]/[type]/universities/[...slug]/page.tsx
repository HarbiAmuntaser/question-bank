/* Fixed Next 15 params typing */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { UniversityHero } from "@/components/public/university-hero";
import { MajorsList } from "@/components/public/majors-list";
import { UniversityDegreeSelector } from "@/components/public/university-degree-selector";
import { MajorDetails } from "@/components/public/major-details";
import { MajorAcademicPeriodDetails } from "@/components/public/major-academic-period-details";
import { SubjectDetails } from "@/components/public/subject-details";
import { QuizDetails } from "@/components/public/quiz-details";
import { StudySummaryDetails } from "@/components/public/study-summaries/study-summary-details";
import { ChapterDetails } from "@/components/public/chapter-details";
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
import {
  getCanonicalInstitutionCountry,
  getCanonicalInstitutionType,
} from "@/lib/public/institution-routing";

import {
  getPublicMajorByRouteKey,
  getPublicQuizPreviewByRouteKey,
  getPublicSubjectByRouteKey,
  getPublicUniversityByRouteKey,
} from "@/lib/server/public-education-loaders";
import {
  getPublicMajorSeoBySlug,
  getPublicQuizSeoBySlug,
  getPublicSubjectSeoBySlug,
  getPublicUniversitySeoBySlug,
  type PublicSeoMeta,
} from "@/lib/server/public-seo";
import {
  getPublishedSubjectSummaries,
  getPublishedSubjectSummaryBySlug,
  getStudySummarySeoMeta,
} from "@/lib/server/study-summaries";
import {
  getChapterSeoMeta,
  getPublicChapterByRouteKey,
  getSubjectChapterCatalog,
} from "@/lib/server/subject-chapters";
import { SITE_NAME, SITE_URL, stripSiteNameFromTitle, withSiteName } from "@/lib/seo";
import { educationPageRobots } from "@/lib/search-indexing";
import { DEGREE_TYPE_OPTIONS, normalizeDegreeType, type DegreeTypeValue } from "@/lib/degree-types";
import {
  getAcademicPeriodLabel,
  getAcademicPeriodRouteKey,
  parseAcademicPeriodRouteKey,
} from "@/lib/academic-periods";

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

function normalizeComparableRouteKey(value: string) {
  try {
    return decodeURIComponent(value).trim().replace(/^\/+|\/+$/g, "");
  } catch {
    return value.trim().replace(/^\/+|\/+$/g, "");
  }
}

function isUuidRouteKey(value: string) {
  return normalizeComparableRouteKey(value)
    .split("/")
    .some((segment) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment));
}

function hasCanonicalRouteKeys(pairs: Array<[current: string, canonical: string]>) {
  return pairs.every(([current, canonical]) => {
    const currentKey = normalizeComparableRouteKey(current);
    const canonicalKey = normalizeComparableRouteKey(canonical);
    return Boolean(currentKey && canonicalKey) && !isUuidRouteKey(currentKey) && currentKey === canonicalKey;
  });
}

/* -------------------------
   Minimal Types (بدون any)
------------------------- */
type University = {
  id: string;
  name: string;
  code?: string | null;
  logoUrl?: string | null;
  countryCode?: string | null;
  institutionType?: string | null;
  visibility?: "country" | "global" | null;
  seo?: { slug?: string | null } | null;
  majors?: unknown[];
};

type Major = {
  id: string;
  name: string;
  code?: string | null;
  seo?: { slug?: string | null } | null;
  university?: University | null;
  subjects?: Array<{
    id: string;
    year: number | null;
    semester: number | null;
  }>;
};

type Subject = {
  id: string;
  name: string;
  seo?: { slug?: string | null } | null;
  major?: Major | null;
};

// -------------------------
// Helpers (Universities / Majors / Subjects / Quizzes)
// -------------------------

async function fetchUniversityBySlugOrCode(slugPathRaw: string): Promise<{ uni: University | null }> {
  return { uni: await getPublicUniversityByRouteKey(slugPathRaw) };
}

async function getSeoForUniversitySlug(slugPathRaw: string): Promise<PublicSeoMeta | null> {
  const slugPath = stripPrefix(slugPathRaw, "جامعات");
  return getPublicUniversitySeoBySlug(slugPath);
}

async function fetchMajorBySlugOrCode(majorSlugPathRaw: string): Promise<{ major: Major | null }> {
  return { major: await getPublicMajorByRouteKey(majorSlugPathRaw) };
}

async function fetchSubjectBySlugOrCode(subjectSlugPathRaw: string): Promise<{ subject: Subject | null }> {
  return { subject: await getPublicSubjectByRouteKey(subjectSlugPathRaw) };
}

async function getSeoForSubjectSlug(subjectSlugPathRaw: string): Promise<PublicSeoMeta | null> {
  const subjectSlugPath = stripPrefix(subjectSlugPathRaw, "مواد");
  return getPublicSubjectSeoBySlug(subjectSlugPath);
}

async function fetchQuizPreviewBySlugOrId(quizSlugPathRaw: string) {
  return { quiz: await getPublicQuizPreviewByRouteKey(quizSlugPathRaw) };
}

async function getSeoForQuizSlug(quizSlugPathRaw: string): Promise<PublicSeoMeta | null> {
  const quizSlugPath = stripPrefix(quizSlugPathRaw, "اختبارات");
  return getPublicQuizSeoBySlug(quizSlugPath);
}

// -------------------------
// Route Parser
// -------------------------

function parseUniversitiesCatchAll(segs: string[]) {
  const majorsIdx = findIndexCI(segs, "majors");
  const subjectsIdx = findIndexCI(segs, "subjects");
  const quizzesIdx = findIndexCI(segs, "quizzes");
  const summariesIdx = findIndexCI(segs, "summaries");
  const chaptersIdx = findIndexCI(segs, "chapters");
  const levelsIdx = findIndexCI(segs, "levels");

  if (majorsIdx < 0) {
    return {
      kind: "university" as const,
      universitySlugPath: joinSlug(segs),
      majorSlugPath: "",
      subjectSlugPath: "",
      quizSlugPath: "",
    };
  }

  if (levelsIdx > majorsIdx && subjectsIdx < 0) {
    return {
      kind: "academicPeriod" as const,
      universitySlugPath: joinSlug(segs.slice(0, majorsIdx)),
      majorSlugPath: joinSlug(segs.slice(majorsIdx + 1, levelsIdx)),
      periodRouteKey: joinSlug(segs.slice(levelsIdx + 1)),
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

  if (chaptersIdx > subjectsIdx) {
    return {
      kind: "chapter" as const,
      universitySlugPath: joinSlug(segs.slice(0, majorsIdx)),
      majorSlugPath: joinSlug(segs.slice(majorsIdx + 1, subjectsIdx)),
      subjectSlugPath: joinSlug(segs.slice(subjectsIdx + 1, chaptersIdx)),
      chapterSlugPath: joinSlug(segs.slice(chaptersIdx + 1)),
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

  // ---- University academic period metadata ----
  if (parsed.kind === "academicPeriod") {
    const { universitySlugPath, majorSlugPath, periodRouteKey } = parsed;
    const period = parseAcademicPeriodRouteKey(periodRouteKey);
    if (type !== "university" || !universitySlugPath || !majorSlugPath || !period) {
      return { title: "مستوى دراسي غير موجود", robots: { index: false, follow: false } };
    }

    const { major } = await fetchMajorBySlugOrCode(majorSlugPath);
    if (!major || major.university?.institutionType !== "university") {
      return { title: "مستوى دراسي غير موجود", robots: { index: false, follow: false } };
    }

    const hasSubjects = (major.subjects ?? []).some(
      (subject) => subject.year === period.year && subject.semester === period.semester,
    );
    if (!hasSubjects) {
      return { title: "مستوى دراسي غير موجود", robots: { index: false, follow: false } };
    }

    const canonicalUniversity = stripPrefix(
      major.university.seo?.slug || major.university.code || universitySlugPath,
      "جامعات",
    );
    const canonicalMajor = stripPrefix(major.seo?.slug || major.code || majorSlugPath, "تخصصات");
    const canonicalPeriod = getAcademicPeriodRouteKey(period);
    const canonicalCountry = (major.university.countryCode || cc).toUpperCase();
    const canonicalPath = `/${canonicalCountry}/university/universities/${encodeSlugPath(
      canonicalUniversity,
    )}/majors/${encodeSlugPath(canonicalMajor)}/levels/${canonicalPeriod}`;
    const canonical = `${SITE_URL}${canonicalPath}`;
    const label = getAcademicPeriodLabel(major.university.countryCode || cc, period);
    const title = `${label} - ${major.name}`;
    const description = `استعرض مواد ${label} ضمن تخصص ${major.name}.`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: withSiteName(title),
        description,
        images: major.university.logoUrl ? [{ url: major.university.logoUrl }] : undefined,
        type: "website",
        url: canonical,
      },
      robots: { index: false, follow: true },
    };
  }

  // ---- Chapter metadata ----
  if (parsed.kind === "chapter") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, chapterSlugPath } = parsed;
    if (
      type === "school" ||
      !universitySlugPath ||
      !majorSlugPath ||
      !subjectSlugPath ||
      !chapterSlugPath
    ) {
      return { title: "فصل غير موجود", robots: { index: false, follow: false } };
    }

    const { subject } = await fetchSubjectBySlugOrCode(subjectSlugPath);
    if (!subject) return { title: "فصل غير موجود", robots: { index: false, follow: false } };

    const chapter = await getPublicChapterByRouteKey(subject.id, chapterSlugPath);
    if (!chapter) return { title: "فصل غير موجود", robots: { index: false, follow: false } };

    const [seo, summaries, catalog] = await Promise.all([
      getChapterSeoMeta(chapter.id).catch(() => null),
      getPublishedSubjectSummaries(subject.id),
      getSubjectChapterCatalog(subject.id),
    ]);
    const summariesCount = summaries.filter((summary) => summary.chapter?.id === chapter.id).length;
    const quizzesCount = catalog.quizzes.filter(
      (quiz) =>
        quiz.questionCount > 0 &&
        quiz.questionChapterIds.length === 1 &&
        quiz.questionChapterIds[0] === chapter.id,
    ).length;
    const hasPublishedContent = summariesCount + quizzesCount > 0;
    const hasCanonicalChapterSlug = Boolean(chapter.slug?.trim());
    const canonicalInstitution = subject.major?.university;
    const canonicalCountry = getCanonicalInstitutionCountry(canonicalInstitution, cc);
    const canonicalType = getCanonicalInstitutionType(canonicalInstitution, type);
    const hasCanonicalContext = canonicalCountry === cc && canonicalType === type;
    const canonicalUni = stripPrefix(subject.major?.university?.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");
    const canonicalPath = `/${canonicalCountry}/${canonicalType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
      canonicalMajor,
    )}/subjects/${encodeSlugPath(canonicalSubject)}/chapters/${encodeURIComponent(chapter.routeKey)}`;
    const canonical = `${SITE_URL}${canonicalPath}`;
    const title = stripSiteNameFromTitle(seo?.metaTitle) || chapter.name;
    const socialTitle = seo?.ogTitle || withSiteName(title);
    const description =
      seo?.metaDescription ||
      chapter.description ||
      `استعرض ملخصات واختبارات ${chapter.name} ضمن مادة ${subject.name}.`;
    const hasCanonicalRoute = hasCanonicalRouteKeys([
      [universitySlugPath, canonicalUni],
      [majorSlugPath, canonicalMajor],
      [subjectSlugPath, canonicalSubject],
      [chapterSlugPath, chapter.routeKey],
    ]);

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: socialTitle,
        description: seo?.ogDescription || description,
        images: seo?.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
        type: "website",
        url: canonical,
      },
      robots: educationPageRobots(seo, {
        requireSeo: true,
        indexable:
          hasPublishedContent && hasCanonicalChapterSlug && hasCanonicalRoute && hasCanonicalContext,
      }),
    };
  }

  // ---- Quiz metadata ----
  if (parsed.kind === "quiz") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, quizSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath || !quizSlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const [{ quiz }, seoCandidate] = await Promise.all([
      fetchQuizPreviewBySlugOrId(quizSlugPath),
      getSeoForQuizSlug(quizSlugPath).catch(() => null),
    ]);

    if (!quiz?.context?.university || !quiz?.context?.major || !quiz?.context?.subject) {
      return { title: "اختبار غير موجود", robots: { index: false, follow: false } };
    }

    const seo = seoCandidate?.ownerId === quiz.id ? seoCandidate : null;
    const canonicalInstitution = quiz.context.university;
    const canonicalCountry = getCanonicalInstitutionCountry(canonicalInstitution, cc);
    const canonicalType = getCanonicalInstitutionType(canonicalInstitution, type);
    const hasCanonicalContext = canonicalCountry === cc && canonicalType === type;
    const canonicalUni = stripPrefix(quiz.context.university.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(quiz.context.major.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(quiz.context.subject.seo?.slug || subjectSlugPath, "مواد");
    const canonicalQuiz = stripPrefix(seo?.slug || quiz.seo?.slug || quizSlugPath, "اختبارات");

    const hasCanonicalRoute = hasCanonicalRouteKeys([
      [universitySlugPath, canonicalUni],
      [majorSlugPath, canonicalMajor],
      [subjectSlugPath, canonicalSubject],
      [quizSlugPath, canonicalQuiz],
    ]);

    const canonicalPath = `/${canonicalCountry}/${canonicalType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
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
      robots: educationPageRobots(seo, {
        requireSeo: true,
        indexable: hasCanonicalRoute && hasCanonicalContext,
      }),
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
    const canonicalInstitution = subject.major?.university;
    const canonicalCountry = getCanonicalInstitutionCountry(canonicalInstitution, cc);
    const canonicalType = getCanonicalInstitutionType(canonicalInstitution, type);
    const hasCanonicalContext = canonicalCountry === cc && canonicalType === type;
    const canonicalUni = stripPrefix(subject.major?.university?.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");
    const canonicalSummary = stripPrefix(summary.slug, "ملخصات");
    const hasCanonicalRoute = hasCanonicalRouteKeys([
      [universitySlugPath, canonicalUni],
      [majorSlugPath, canonicalMajor],
      [subjectSlugPath, canonicalSubject],
      [summarySlugPath, canonicalSummary],
    ]);

    const canonicalPath = `/${canonicalCountry}/${canonicalType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
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
      robots: educationPageRobots(seo, {
        requireSeo: true,
        indexable: hasCanonicalRoute && hasCanonicalContext,
      }),
    };
  }

  // ---- Subject metadata ----
  if (parsed.kind === "subject") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const [{ subject }, seoCandidate] = await Promise.all([
      fetchSubjectBySlugOrCode(subjectSlugPath),
      getSeoForSubjectSlug(subjectSlugPath).catch(() => null),
    ]);
    const seo = subject && seoCandidate?.ownerId === subject.id ? seoCandidate : null;

    if (!subject) {
      return { title: "مادة غير موجودة", robots: { index: false, follow: false } };
    }

    const canonicalInstitution = subject.major?.university;
    const canonicalCountry = getCanonicalInstitutionCountry(canonicalInstitution, cc);
    const canonicalType = getCanonicalInstitutionType(canonicalInstitution, type);
    const hasCanonicalContext = canonicalCountry === cc && canonicalType === type;
    const canonicalUni = stripPrefix(subject.major?.university?.seo?.slug || universitySlugPath, "جامعات");
    const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");

    const hasCanonicalRoute = hasCanonicalRouteKeys([
      [universitySlugPath, canonicalUni],
      [majorSlugPath, canonicalMajor],
      [subjectSlugPath, canonicalSubject],
    ]);

    const canonicalPath = `/${canonicalCountry}/${canonicalType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
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
      robots: educationPageRobots(seo, {
        requireSeo: true,
        indexable: hasCanonicalRoute && hasCanonicalContext,
      }),
    };
  }

  // ---- Major metadata ----
  if (parsed.kind === "major") {
    const { universitySlugPath, majorSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath) {
      return { title: "غير موجود", robots: { index: false, follow: false } };
    }

    const [{ major }, seoCandidate] = await Promise.all([
      fetchMajorBySlugOrCode(majorSlugPath),
      getPublicMajorSeoBySlug(majorSlugPath).catch(() => null),
    ]);
    if (!major) {
      return { title: "تخصص غير موجود", robots: { index: false, follow: false } };
    }

    const seo = seoCandidate?.ownerId === major.id ? seoCandidate : null;
    const canonicalInstitution = major.university;
    const canonicalCountry = getCanonicalInstitutionCountry(canonicalInstitution, cc);
    const canonicalType = getCanonicalInstitutionType(canonicalInstitution, type);
    const hasCanonicalContext = canonicalCountry === cc && canonicalType === type;
    const canonicalMajor = stripPrefix(major.seo?.slug || majorSlugPath, "تخصصات");
    const canonicalUni = stripPrefix(major.university?.seo?.slug || universitySlugPath, "جامعات");
    const hasCanonicalRoute = hasCanonicalRouteKeys([
      [universitySlugPath, canonicalUni],
      [majorSlugPath, canonicalMajor],
    ]);

    const canonicalPath = `/${canonicalCountry}/${canonicalType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
      canonicalMajor
    )}`;

    const canonical = `${SITE_URL}${canonicalPath}`;

    const title = stripSiteNameFromTitle(seo?.metaTitle) || major.name;
    const socialTitle = seo?.ogTitle || withSiteName(title);
    const description = seo?.metaDescription || `استكشف مواد تخصص ${major.name} واستعد للاختبارات.`;
    const ogImage = seo?.ogImageUrl || major.university?.logoUrl || undefined;

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
      robots: educationPageRobots(seo, {
        requireSeo: true,
        indexable: hasCanonicalRoute && hasCanonicalContext,
      }),
    };
  }

  // ---- University metadata ----
  const slugPath = parsed.universitySlugPath;

  const [seoCandidate, uniRes] = await Promise.all([
    getSeoForUniversitySlug(slugPath).catch(() => null),
    fetchUniversityBySlugOrCode(slugPath),
  ]);

  const uni = uniRes.uni;

  if (!uni) {
    return { title: "غير موجود", robots: { index: false, follow: false } };
  }

  const seo = seoCandidate?.ownerId === uni.id ? seoCandidate : null;
  const canonicalCountry = getCanonicalInstitutionCountry(uni, cc);
  const canonicalType = getCanonicalInstitutionType(uni, type);
  const hasCanonicalContext = canonicalCountry === cc && canonicalType === type;
  const canonicalSlug = stripPrefix(uni?.seo?.slug || slugPath, "جامعات");
  const hasCanonicalRoute = hasCanonicalRouteKeys([[slugPath, canonicalSlug]]);
  const canonicalPath = `/${canonicalCountry}/${canonicalType}/universities/${encodeSlugPath(canonicalSlug)}`;
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
    robots: educationPageRobots(seo, {
      requireSeo: true,
      indexable: hasCanonicalRoute && hasCanonicalContext,
    }),
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

  if (parsed.kind === "academicPeriod") {
    const { universitySlugPath, majorSlugPath, periodRouteKey } = parsed;
    if (type !== "university" || !universitySlugPath || !majorSlugPath || !periodRouteKey) notFound();

    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <MajorAcademicPeriodDetails
            cc={cc}
            type={type}
            universitySlugPath={universitySlugPath}
            majorSlugPath={majorSlugPath}
            periodRouteKey={periodRouteKey}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  if (parsed.kind === "chapter") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, chapterSlugPath } = parsed;
    if (
      type === "school" ||
      !universitySlugPath ||
      !majorSlugPath ||
      !subjectSlugPath ||
      !chapterSlugPath
    ) notFound();

    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <ChapterDetails
            cc={cc}
            type={type}
            universitySlugPath={universitySlugPath}
            majorSlugPath={majorSlugPath}
            subjectSlugPath={subjectSlugPath}
            chapterRouteKey={chapterSlugPath}
          />
        </main>
        <PublicFooter cc={cc} />
      </div>
    );
  }

  if (parsed.kind === "quiz") {
    const { universitySlugPath, majorSlugPath, subjectSlugPath, quizSlugPath } = parsed;
    if (!universitySlugPath || !majorSlugPath || !subjectSlugPath || !quizSlugPath) notFound();

    return (
      <div className="flex flex-col min-h-screen">
        <PublicHeader />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
  const isGlobalAcademy = uniType === "academy" && uni.visibility === "global";

  const canonicalSlugFromUni = uni.seo?.slug ?? null;
  const finalSlug = stripPrefix(canonicalSlugFromUni || slugPath, "جامعات");

  // mismatch → redirect للمسار الصحيح
  if (uniType && uniType !== type) {
    redirect(`/${isGlobalAcademy ? cc : uniCC}/${uniType}/universities/${encodeSlugPath(finalSlug)}`);
  }

  if (uniCC && uniType && !isGlobalAcademy && uniCC !== cc) {
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
  const majorsSectionCopy =
    type === "academy"
      ? {
          title: "البرامج التدريبية المتاحة",
          description: "اختر البرنامج التدريبي الذي تريد استكشاف مهاراته ومواده.",
        }
      : type === "school"
        ? {
            title: "المسارات الدراسية المتاحة",
            description: "اختر المسار الدراسي الذي تريد استكشاف مواده واختباراته.",
          }
        : {
            title: "التخصصات المتاحة",
            description: "اختر التخصص الذي تريد استكشافه.",
          };

  if (isUniversityType && degreeGroups.length > 1 && !selectedDegree) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main id="main-content" tabIndex={-1}>
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
      <main id="main-content" tabIndex={-1}>
        <UniversityHero university={uniTyped} />

        <section id="majors-section" className="px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-5 lg:px-8 lg:pb-14 lg:pt-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 space-y-2 sm:mb-8">
              <h2 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">
                {majorsSectionCopy.title}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {majorsSectionCopy.description}
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

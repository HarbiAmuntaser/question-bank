import { revalidatePath, revalidateTag } from "next/cache";

import { SUPPORTED_COUNTRIES } from "@/config/regions";
import { CACHE_TAGS } from "@/lib/cache-tags";

function revalidateTags(tags: Array<string | null | undefined>) {
  for (const tag of new Set(tags.filter(Boolean) as string[])) {
    revalidateTag(tag);
  }
}

function normalizedCountryCodes(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim().toUpperCase())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function revalidateInstitutionPaths(countryCodes: string[]) {
  for (const cc of countryCodes) {
    revalidatePath(`/${cc}`);
    revalidatePath(`/${cc}/university`);
    revalidatePath(`/${cc}/school`);
    revalidatePath(`/${cc}/academy`);
  }
}

type BlogCacheSnapshot = {
  slug?: string | null;
  visibility?: string | null;
  countries?: Array<string | null | undefined>;
  status?: string | null;
  publishedAt?: Date | string | null;
};

type BlogCacheInput = {
  postId?: string | null;
  previous?: BlogCacheSnapshot | null;
  next?: BlogCacheSnapshot | null;
  taxonomy?: "topics" | "tags";
  allCountries?: boolean;
};

export type StudySummaryCacheSnapshot = {
  id?: string | null;
  slug?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  subjectPath?: string | null;
  summaryPath?: string | null;
};

type StudySummaryCacheInput = {
  previous?: StudySummaryCacheSnapshot | null;
  next?: StudySummaryCacheSnapshot | null;
};

const allBlogCountries = Object.keys(SUPPORTED_COUNTRIES);

function blogSnapshotCountries(snapshot?: BlogCacheSnapshot | null) {
  if (!snapshot) return [];
  if (snapshot.visibility === "global") return allBlogCountries;
  return normalizedCountryCodes(snapshot.countries ?? []).filter((cc) => cc in SUPPORTED_COUNTRIES);
}

export function revalidateBlogCache(input: BlogCacheInput = {}) {
  const affectedCountries = input.allCountries || (!input.previous && !input.next)
    ? allBlogCountries
    : Array.from(
        new Set([
          ...blogSnapshotCountries(input.previous),
          ...blogSnapshotCountries(input.next),
        ]),
      );
  const slugs = Array.from(
    new Set(
      [input.previous?.slug, input.next?.slug]
        .map((slug) => slug?.trim())
        .filter((slug): slug is string => Boolean(slug)),
    ),
  );

  revalidateTags([
    CACHE_TAGS.admin.blog,
    CACHE_TAGS.public.blog,
    input.postId ? CACHE_TAGS.public.blogPost(input.postId) : null,
    ...slugs.map((slug) => CACHE_TAGS.public.blogSlug(slug)),
    ...affectedCountries.map((cc) => CACHE_TAGS.public.blogCountry(cc)),
    input.taxonomy === "topics" ? CACHE_TAGS.public.blogTopics : null,
    input.taxonomy === "tags" ? CACHE_TAGS.public.blogTags : null,
  ]);

  for (const cc of affectedCountries) {
    revalidatePath(`/${cc}/blog`);
    for (const slug of slugs) {
      revalidatePath(`/${cc}/blog/${encodeURIComponent(slug)}`);
    }
  }

  revalidatePath("/sitemap.xml");
}

export function revalidateUniversityCache(
  input: { id?: string | null; countryCode?: string | null; previousCountryCode?: string | null; allCountries?: boolean } = {},
) {
  const countryCodes = input.allCountries
    ? Object.keys(SUPPORTED_COUNTRIES)
    : normalizedCountryCodes([input.countryCode, input.previousCountryCode]);

  revalidateTags([
    "universities",
    "student-universities",
    "student-university-detail",
    CACHE_TAGS.admin.universities,
    CACHE_TAGS.public.institutions,
    input.id ? CACHE_TAGS.public.institution(input.id) : null,
    ...countryCodes.map((countryCode) => CACHE_TAGS.public.institutionsCountry(countryCode)),
    CACHE_TAGS.public.majors,
    CACHE_TAGS.public.subjects,
    CACHE_TAGS.public.quizzes,
    CACHE_TAGS.public.seo,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);

  revalidateInstitutionPaths(countryCodes);
}

export function revalidateMajorCache(input: { id?: string | null; universityId?: string | null } = {}) {
  revalidateTags([
    "majors",
    "student-majors",
    "student-major-detail",
    CACHE_TAGS.admin.majors,
    CACHE_TAGS.public.majors,
    input.id ? CACHE_TAGS.public.major(input.id) : null,
    input.universityId ? CACHE_TAGS.public.majorsByUniversity(input.universityId) : null,
    CACHE_TAGS.public.institutions,
    CACHE_TAGS.public.subjects,
    CACHE_TAGS.public.quizzes,
    CACHE_TAGS.public.seo,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateSubjectCache(
  input: { id?: string | null; majorId?: string | null; previousMajorId?: string | null } = {},
) {
  const majorIds = Array.from(
    new Set([input.majorId, input.previousMajorId].map((id) => id?.trim()).filter(Boolean) as string[]),
  );

  revalidateTags([
    "subjects",
    "student-subjects",
    "student-subject-detail",
    CACHE_TAGS.admin.subjects,
    CACHE_TAGS.public.subjects,
    input.id ? CACHE_TAGS.public.subject(input.id) : null,
    input.id ? CACHE_TAGS.public.summariesBySubject(input.id) : null,
    input.id ? CACHE_TAGS.public.chaptersBySubject(input.id) : null,
    ...majorIds.map((majorId) => CACHE_TAGS.public.subjectsByMajor(majorId)),
    ...majorIds.map((majorId) => CACHE_TAGS.public.major(majorId)),
    input.id ? CACHE_TAGS.public.quizzesBySubject(input.id) : null,
    CACHE_TAGS.public.summaries,
    CACHE_TAGS.public.chapters,
    CACHE_TAGS.public.majors,
    CACHE_TAGS.public.institutions,
    CACHE_TAGS.public.quizzes,
    CACHE_TAGS.public.seo,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateStudySummaryCache(input: StudySummaryCacheInput = {}) {
  const snapshots = [input.previous, input.next].filter(Boolean) as StudySummaryCacheSnapshot[];
  const summaryIds = Array.from(new Set(snapshots.map((item) => item.id?.trim()).filter(Boolean) as string[]));
  const subjectIds = Array.from(new Set(snapshots.map((item) => item.subjectId?.trim()).filter(Boolean) as string[]));
  const chapterIds = Array.from(new Set(snapshots.map((item) => item.chapterId?.trim()).filter(Boolean) as string[]));
  const paths = Array.from(
    new Set(
      snapshots
        .flatMap((item) => [item.subjectPath, item.summaryPath])
        .map((path) => path?.trim())
        .filter((path): path is string => Boolean(path)),
    ),
  );

  revalidateTags([
    "student-summaries",
    "student-summary-detail",
    CACHE_TAGS.admin.summaries,
    CACHE_TAGS.public.summaries,
    CACHE_TAGS.public.subjects,
    CACHE_TAGS.public.seo,
    ...summaryIds.map((id) => CACHE_TAGS.public.summary(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.subject(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.summariesBySubject(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.chaptersBySubject(id)),
    ...chapterIds.map((id) => CACHE_TAGS.public.chapter(id)),
  ]);

  for (const path of paths) {
    revalidatePath(path);
  }

  revalidatePath("/sitemap.xml");
}

export function revalidateChapterCache(
  input: { id?: string | null; subjectId?: string | null; previousSubjectId?: string | null } = {},
) {
  const affectedSubjectIds = Array.from(
    new Set([input.subjectId, input.previousSubjectId].map((id) => id?.trim()).filter(Boolean) as string[]),
  );
  revalidateTags([
    "chapters",
    CACHE_TAGS.admin.chapters,
    CACHE_TAGS.public.chapters,
    input.id ? CACHE_TAGS.public.chapter(input.id) : null,
    CACHE_TAGS.public.subjects,
    ...affectedSubjectIds.map((id) => CACHE_TAGS.public.subject(id)),
    ...affectedSubjectIds.map((id) => CACHE_TAGS.public.chaptersBySubject(id)),
    CACHE_TAGS.public.quizzes,
    ...affectedSubjectIds.map((id) => CACHE_TAGS.public.quizzesBySubject(id)),
    ...affectedSubjectIds.map((id) => CACHE_TAGS.public.summariesBySubject(id)),
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateQuestionCache(
  input: {
    chapterId?: string | null;
    previousChapterId?: string | null;
    subjectId?: string | null;
    previousSubjectId?: string | null;
  } = {},
) {
  const subjectIds = Array.from(
    new Set([input.subjectId, input.previousSubjectId].map((id) => id?.trim()).filter(Boolean) as string[]),
  );
  const chapterIds = Array.from(
    new Set([input.chapterId, input.previousChapterId].map((id) => id?.trim()).filter(Boolean) as string[]),
  );
  revalidateTags([
    "questions",
    CACHE_TAGS.admin.questions,
    CACHE_TAGS.public.quizzes,
    "student-quizzes",
    "student-quiz-preview",
    "student-quizzes-by-subject",
    CACHE_TAGS.public.chapters,
    ...chapterIds.map((id) => CACHE_TAGS.public.chapter(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.subject(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.chaptersBySubject(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.quizzesBySubject(id)),
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateQuizCache(
  input: { id?: string | null; subjectId?: string | null; subjectIds?: Array<string | null | undefined> } = {},
) {
  const subjectIds = Array.from(
    new Set([input.subjectId, ...(input.subjectIds ?? [])].map((id) => id?.trim()).filter(Boolean) as string[]),
  );
  revalidateTags([
    "quizzes",
    "student-quizzes",
    "student-quiz-preview",
    "student-quizzes-by-subject",
    CACHE_TAGS.admin.quizzes,
    CACHE_TAGS.public.quizzes,
    input.id ? CACHE_TAGS.public.quiz(input.id) : null,
    CACHE_TAGS.public.chapters,
    ...subjectIds.map((id) => CACHE_TAGS.public.subject(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.chaptersBySubject(id)),
    ...subjectIds.map((id) => CACHE_TAGS.public.quizzesBySubject(id)),
    CACHE_TAGS.public.subjects,
    CACHE_TAGS.public.seo,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateSeoCache(input: { ownerType?: string | null; ownerId?: string | null } = {}) {
  const { ownerType, ownerId } = input;
  revalidateTags([
    "seo-meta",
    CACHE_TAGS.admin.seo,
    CACHE_TAGS.public.seo,
    ownerType && ownerId ? CACHE_TAGS.public.seoOwner(ownerType, ownerId) : null,
    ownerType === "university" ? "student-universities" : null,
    ownerType === "university" ? "student-university-detail" : null,
    ownerType === "university" ? CACHE_TAGS.public.institutions : null,
    ownerType === "university" && ownerId ? CACHE_TAGS.public.institution(ownerId) : null,
    ownerType === "major" ? "student-majors" : null,
    ownerType === "major" ? "student-major-detail" : null,
    ownerType === "major" ? CACHE_TAGS.public.majors : null,
    ownerType === "major" && ownerId ? CACHE_TAGS.public.major(ownerId) : null,
    ownerType === "subject" ? "student-subjects" : null,
    ownerType === "subject" ? "student-subject-detail" : null,
    ownerType === "subject" ? CACHE_TAGS.public.subjects : null,
    ownerType === "subject" && ownerId ? CACHE_TAGS.public.subject(ownerId) : null,
    ownerType === "chapter" ? CACHE_TAGS.public.chapters : null,
    ownerType === "chapter" && ownerId ? CACHE_TAGS.public.chapter(ownerId) : null,
    ownerType === "study_summary" ? "student-summaries" : null,
    ownerType === "study_summary" ? "student-summary-detail" : null,
    ownerType === "study_summary" ? CACHE_TAGS.public.summaries : null,
    ownerType === "study_summary" && ownerId ? CACHE_TAGS.public.summary(ownerId) : null,
    ownerType === "exam" ? "student-quizzes" : null,
    ownerType === "exam" ? "student-quiz-preview" : null,
    ownerType === "exam" ? CACHE_TAGS.public.quizzes : null,
    ownerType === "exam" && ownerId ? CACHE_TAGS.public.quiz(ownerId) : null,
  ]);

  if (ownerType === "blog_post") {
    revalidateBlogCache({ postId: ownerId, allCountries: true });
  }

  if (ownerType === "blog_topic") {
    revalidateBlogCache({ taxonomy: "topics", allCountries: true });
  }

  if (ownerType === "study_summary") {
    revalidateStudySummaryCache({ next: { id: ownerId } });
  }
}

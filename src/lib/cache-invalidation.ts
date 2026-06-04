import { revalidatePath, revalidateTag } from "next/cache";

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

export function revalidateUniversityCache(
  input: { id?: string | null; countryCode?: string | null; previousCountryCode?: string | null } = {},
) {
  const countryCodes = normalizedCountryCodes([input.countryCode, input.previousCountryCode]);

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

export function revalidateSubjectCache(input: { id?: string | null; majorId?: string | null } = {}) {
  revalidateTags([
    "subjects",
    "student-subjects",
    "student-subject-detail",
    CACHE_TAGS.admin.subjects,
    CACHE_TAGS.public.subjects,
    input.id ? CACHE_TAGS.public.subject(input.id) : null,
    input.majorId ? CACHE_TAGS.public.subjectsByMajor(input.majorId) : null,
    input.id ? CACHE_TAGS.public.quizzesBySubject(input.id) : null,
    CACHE_TAGS.public.majors,
    CACHE_TAGS.public.institutions,
    CACHE_TAGS.public.quizzes,
    CACHE_TAGS.public.seo,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateChapterCache(input: { subjectId?: string | null } = {}) {
  revalidateTags([
    "chapters",
    CACHE_TAGS.admin.chapters,
    CACHE_TAGS.public.subjects,
    input.subjectId ? CACHE_TAGS.public.subject(input.subjectId) : null,
    CACHE_TAGS.public.quizzes,
    input.subjectId ? CACHE_TAGS.public.quizzesBySubject(input.subjectId) : null,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateQuestionCache(input: { subjectId?: string | null } = {}) {
  revalidateTags([
    "questions",
    CACHE_TAGS.admin.questions,
    CACHE_TAGS.public.quizzes,
    "student-quizzes",
    "student-quiz-preview",
    "student-quizzes-by-subject",
    input.subjectId ? CACHE_TAGS.public.subject(input.subjectId) : null,
    input.subjectId ? CACHE_TAGS.public.quizzesBySubject(input.subjectId) : null,
    CACHE_TAGS.public.stats,
    "student-stats",
  ]);
}

export function revalidateQuizCache(input: { id?: string | null; subjectId?: string | null } = {}) {
  revalidateTags([
    "quizzes",
    "student-quizzes",
    "student-quiz-preview",
    "student-quizzes-by-subject",
    CACHE_TAGS.admin.quizzes,
    CACHE_TAGS.public.quizzes,
    input.id ? CACHE_TAGS.public.quiz(input.id) : null,
    input.subjectId ? CACHE_TAGS.public.quizzesBySubject(input.subjectId) : null,
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
    ownerType === "exam" ? "student-quizzes" : null,
    ownerType === "exam" ? "student-quiz-preview" : null,
    ownerType === "exam" ? CACHE_TAGS.public.quizzes : null,
    ownerType === "exam" && ownerId ? CACHE_TAGS.public.quiz(ownerId) : null,
  ]);
}

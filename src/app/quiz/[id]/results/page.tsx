/* Fixed Next 15 params typing */

// src/app/quiz/[id]/results/page.tsx
import { notFound } from "next/navigation";

import type { QuizWithQuestions } from "@/types";
import { fetchJSON } from "@/lib/server/student-fetch";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { QuizResults } from "@/components/public/quiz/result/quiz-results";
import { PublicHeader } from "@/components/public/public-header/public-header";

export const revalidate = 60;

type PageParams = { id: string };
type SearchParams = { session?: string };

type QuizContext = {
  context?: {
    university?: {
      countryCode?: string | null;
      institutionType?: string | null;
      seo?: { slug: string | null } | null;
      code?: string | null;
      id?: string;
    } | null;
    major?: {
      seo?: { slug: string | null } | null;
      code?: string | null;
      id?: string;
    } | null;
    subject?: {
      seo?: { slug: string | null } | null;
      code?: string | null;
      id?: string;
    } | null;
  } | null;
};

function safeCC(v?: string | null) {
  const x = (v || "").toUpperCase();
  return x && x.length === 2 ? x : "SA";
}

function safeType(v?: string | null) {
  const x = (v || "").toLowerCase();
  return x || "university";
}

function buildSubjectUrlFromContext(ctx?: QuizContext | null) {
  const uni = ctx?.context?.university || null;
  const major = ctx?.context?.major || null;
  const subject = ctx?.context?.subject || null;
  if (!uni || !major || !subject) return null;

  const cc = safeCC(uni.countryCode);
  const type = safeType(uni.institutionType);

  const uniSlug = stripPrefix(uni.seo?.slug || uni.code || uni.id || "", "جامعات");
  const majorSlug = stripPrefix(major.seo?.slug || major.code || major.id || "", "تخصصات");
  const subjectSlug = stripPrefix(subject.seo?.slug || subject.code || subject.id || "", "مواد");

  if (!uniSlug || !majorSlug || !subjectSlug) return null;

  return (
    `/${cc}/${type}` +
    `/universities/${encodeSlugPath(uniSlug)}` +
    `/majors/${encodeSlugPath(majorSlug)}` +
    `/subjects/${encodeSlugPath(subjectSlug)}`
  );
}

export default async function QuizResultsPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const p = await params;
  const sp = await searchParams;

  const id = (p?.id || "").trim();
  const sessionId = (sp?.session || "").trim();

  if (!id || !sessionId) notFound();

  const quizRes = await fetchJSON<QuizWithQuestions>(
    `/api/v1/student/quizzes/by-id/${encodeURIComponent(id)}`
  );
  if (!quizRes.ok || !quizRes.data) notFound();
  const quiz = quizRes.data;

  const ctxRes = await fetchJSON<QuizContext>(
    `/api/v1/student/quizzes/by-id-context/${encodeURIComponent(id)}`
  );
  const backToSubjectUrl = ctxRes.ok ? buildSubjectUrlFromContext(ctxRes.data) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader />
      <main className="container mx-auto px-4 py-8">
        <QuizResults quiz={quiz} sessionId={sessionId} backToSubjectUrl={backToSubjectUrl ?? undefined} />
      </main>
    </div>
  );
}

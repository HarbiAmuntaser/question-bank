/* Fixed Next 15 params typing */

// src/app/quiz/[id]/review/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type { QuizWithQuestions } from "@/types";
import { fetchJSON } from "@/lib/server/student-fetch";
import QuizReview from "@/components/public/quiz/review/quiz-review";
import { PublicHeader } from "@/components/public/public-header/public-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageParams = { id: string };
type SearchParams = { session?: string; onlyWrong?: string };

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const p = await params;
  const sp = await searchParams;

  const id = (p?.id || "").trim();
  if (!id) notFound();

  const quizRes = await fetchJSON<QuizWithQuestions>(
    `/api/v1/student/quizzes/by-id/${encodeURIComponent(id)}`,
    { cache: "no-store" },
    0
  );
  if (!quizRes.ok || !quizRes.data) notFound();

  const onlyWrong = sp?.onlyWrong === "1";
  const sessionId = (sp?.session || "").trim();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-4 sm:py-4 lg:px-8">
        <QuizReview quiz={quizRes.data} sessionId={sessionId} onlyWrong={onlyWrong} />
      </main>
    </div>
  );
}

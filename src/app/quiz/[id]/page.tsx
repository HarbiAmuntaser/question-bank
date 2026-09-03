/* Fixed Next 15 params typing */

// src/app/quiz/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { QuizWithQuestions } from "@/types";
import { QuizInterface } from "@/components/public/quiz/quiz-interface";
import { fetchJSON } from "@/lib/server/student-fetch";
import { PublicHeader } from "@/components/public/public-header/public-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageParams = { id: string };

export default async function QuizPage({ params }: { params: Promise<PageParams> }) {
  const { id } = await params;

  const res = await fetchJSON<QuizWithQuestions>(
    `/api/v1/student/quizzes/by-id/${encodeURIComponent(id)}`,
    { cache: "no-store" },
    0
  );

  if (!res.ok || !res.data) notFound();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-4 sm:py-4 lg:px-8">
        <QuizInterface quiz={res.data} />
      </main>
    </div>
  );
}

/* Fixed Next 15 params typing */

// src/app/quiz/[id]/page.tsx
import { notFound } from "next/navigation";
import type { QuizWithQuestions } from "@/types";
import { QuizInterface } from "@/components/public/quiz/quiz-interface";
import { fetchJSON } from "@/lib/server/student-fetch";
import { PublicHeader } from "@/components/public/public-header/public-header";

export const revalidate = 60;

type PageParams = { id: string };

export default async function QuizPage({ params }: { params: Promise<PageParams> }) {
  const { id } = await params;

  const res = await fetchJSON<QuizWithQuestions>(
    `/api/v1/student/quizzes/by-id/${encodeURIComponent(id)}`
  );

  if (!res.ok || !res.data) notFound();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader />
      <main className="container mx-auto px-4 py-8">
        <QuizInterface quiz={res.data} />
      </main>
    </div>
  );
}

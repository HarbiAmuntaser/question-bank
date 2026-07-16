// src/components/public/quiz/result/result-actions.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, RotateCcw } from "lucide-react";
import { makeQuizKeys } from "../storage";

export function ResultActions({
  quizId,
  sessionId,
  backToSubjectUrl,
}: {
  quizId: string;
  sessionId: string;
  backToSubjectUrl?: string;
}) {
  const router = useRouter();

  const handleRetry = () => {
    const keys = makeQuizKeys(quizId);
    try {
      localStorage.removeItem(keys.answers);
      localStorage.removeItem(keys.active);
    } catch {}
    router.push(`/quiz/${encodeURIComponent(quizId)}?fresh=1`);
  };

  const reviewAllHref = `/quiz/${encodeURIComponent(quizId)}/review?session=${encodeURIComponent(sessionId)}`;
  const reviewWrongHref = `${reviewAllHref}&onlyWrong=1`;

  return (
    <Card className="no-print border bg-card/95 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild className="flex h-11 items-center justify-center gap-2 rounded-lg">
            <Link href={reviewWrongHref}>
              <CheckCircle className="h-4 w-4" aria-hidden />
              مراجعة الأسئلة الخاطئة
            </Link>
          </Button>

          <Button asChild variant="outline" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-transparent">
            <Link href={reviewAllHref}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              مراجعة جميع الأسئلة
            </Link>
          </Button>

          <Button onClick={handleRetry} className="flex h-11 items-center justify-center gap-2 rounded-lg">
            <RotateCcw className="h-4 w-4" aria-hidden />
            إعادة المحاولة
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push(backToSubjectUrl || "/")}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            اختبارات المادة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

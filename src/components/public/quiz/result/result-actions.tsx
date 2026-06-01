// src/components/public/quiz/result/result-actions.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Share2, Printer, ArrowLeft, CheckCircle } from "lucide-react";
import { makeQuizKeys } from "../storage";

async function tryShare(text: string) {
  const url = window.location.href;

  // @ts-ignore
  if (navigator.share) {
    // @ts-ignore
    await navigator.share({ title: "نتيجة الاختبار", text, url });
    return true;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return true;
  }
  return false;
}

export function ResultActions({
  quizId,
  sessionId,
  backToSubjectUrl,
  shareText,
}: {
  quizId: string;
  sessionId: string;
  backToSubjectUrl?: string;
  shareText: string;
}) {
  const router = useRouter();

  const handleRetry = () => {
    const keys = makeQuizKeys(quizId);
    try {
      localStorage.removeItem(keys.answers);
      localStorage.removeItem(keys.active);
      // لا نمسح quiz_results للحفاظ على تاريخ المحاولات
    } catch {}
    router.push(`/quiz/${encodeURIComponent(quizId)}?fresh=1`);
  };

  const handleShare = async () => {
    try {
      const ok = await tryShare(shareText);
      if (!ok) alert("تعذر المشاركة تلقائياً. انسخ الرابط يدوياً من شريط العنوان.");
    } catch {
      alert("تعذر مشاركة النتيجة.");
    }
  };

  const reviewAllHref = `/quiz/${encodeURIComponent(quizId)}/review?session=${encodeURIComponent(sessionId)}`;
  const reviewWrongHref = `${reviewAllHref}&onlyWrong=1`;

  return (
    <Card className="no-print border bg-card/95 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col justify-center gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button onClick={handleRetry} className="flex h-11 items-center justify-center gap-2 rounded-lg">
              <RotateCcw className="h-4 w-4" aria-hidden />
              إعادة المحاولة
            </Button>

            <Button variant="outline" onClick={handleShare} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-transparent">
              <Share2 className="h-4 w-4" aria-hidden />
              مشاركة النتيجة
            </Button>

            <Button variant="outline" onClick={() => window.print()} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-transparent">
              <Printer className="h-4 w-4" aria-hidden />
              طباعة / حفظ PDF
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
        </div>
      </CardContent>
    </Card>
  );
}

// src/app/quizzes/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicLoadingState } from "@/components/public/public-loading-state";
import { QuizzesListing } from "@/components/public/quizzes-listing";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { withSiteName } from "@/lib/seo";
import { formatArabicList, getEnabledPublicTypeLabels } from "@/config/public-features";

export const revalidate = 3600; // ساعة واحدة كبداية قبل رفع TTL أكثر.

// ——— Helpers
type NextFetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

async function fetchJSON<T>(url: string, init?: NextFetchInit): Promise<T> {
  const base = await getRequestOrigin();
  const abs = url.startsWith("http") ? url : `${base}${url}`;
  const res = await fetch(abs, { ...init, next: { revalidate: 3600, ...(init?.next ?? {}) } });
  if (!res.ok) throw new Error(`Failed to fetch ${abs} (${res.status})`);
  const body = await res.json();
  // كل راوتات الطالب ترجع { data }
  return (body?.data ?? body) as T;
}

type University = { id: string; name: string };
type Major = {
  id: string; name: string; degreeType: string | null;
  universityId: string; createdAt?: string | Date; updatedAt?: string | Date; durationYears?: number | null; createdBy?: string | null;
};
type Subject = { id: string; name: string; majorId: string };
type QuizItem = {
  id: string; title: string; description: string | null; timeLimit: number; createdAt: string | Date;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  _count: { questions: number };
  university?: { id: string; name: string } | null;
  major?: { id: string; name: string; degreeType: string | null; universityId: string } | null;
  subject?: { id: string; name: string; majorId: string } | null;
  chapter?: { id: string; name: string; subject: { id: string; name: string; majorId: string } } | null;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

const pageTitle = "الاختبارات";
const socialTitle = withSiteName(pageTitle);
const pageDescription = `تصفح الاختبارات والمواد المنظمة ضمن ${formatArabicList(
  getEnabledPublicTypeLabels(),
)} بسهولة.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  robots: { index: false, follow: true },
  openGraph: {
    title: socialTitle,
    description: pageDescription,
    type: "website",
  },
};

export default async function QuizzesPage({
  searchParams,
}: {
  // ✅ Next 15 يتطلب await عند القراءة
  searchParams: Promise<{
    universityId?: string;
    majorId?: string;
    degreeType?: string;
    subjectId?: string;
    searchTerm?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const sp = await searchParams;

  // كوّن الاستعلام للـ API
  // ...
  const qs = new URLSearchParams();
  if (sp.universityId) qs.set("universityId", sp.universityId);
  if (sp.majorId) qs.set("majorId", sp.majorId);
  if (sp.degreeType) qs.set("degreeType", sp.degreeType);
  if (sp.subjectId) qs.set("subjectId", sp.subjectId);
  if (sp.searchTerm) qs.set("searchTerm", sp.searchTerm);
  if (sp.page) qs.set("page", sp.page);
  if (sp.pageSize) qs.set("pageSize", sp.pageSize);

  const quizzesUrl = qs.toString()
    ? `/api/v1/student/quizzes?${qs.toString()}`
    : `/api/v1/student/quizzes`;

  const [universities, majors, subjects, quizzesResp] = await Promise.all([
    fetchJSON<University[]>("/api/v1/student/universities/select"),
    fetchJSON<Major[]>("/api/v1/student/majors/select"),
    fetchJSON<Subject[]>("/api/v1/student/subjects/select"),
    fetchJSON<{ data: QuizItem[]; pagination: Pagination }>(quizzesUrl),
  ]);


  const initialQuizzes = quizzesResp?.data ?? [];

  // تطبيع طفيف للأنواع المحتملة المفقودة
  const formattedMajors = majors.map((m) => ({
    ...m,
    durationYears: m.durationYears ?? null,
    createdAt: m.createdAt ?? new Date().toISOString(),
    updatedAt: m.updatedAt ?? new Date().toISOString(),
    createdBy: m.createdBy ?? null,
  }));

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Suspense
        fallback={
          <PublicLoadingState
            title="جاري تجهيز الاختبارات..."
            description="نرتب الاختبارات والفلاتر لتصل إلى المحتوى المناسب بسرعة."
            cards={6}
          />
        }
      >
        <QuizzesListing
          initialQuizzes={initialQuizzes}
          universities={universities}
          majors={formattedMajors}
          subjects={subjects}
        />
      </Suspense>
    </div>
  );
}

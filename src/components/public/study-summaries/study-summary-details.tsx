import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpenText, Clock, Download, FileText, GraduationCap, Layers3, Lock, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { InstitutionType } from "@/config/regions";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { fetchJSON } from "@/lib/server/student-fetch";
import { checkStudySummaryAccess } from "@/lib/server/access-control";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import {
  getPublishedStudySummaryContent,
  getPublishedSubjectSummaryBySlug,
  prepareTrustedSummaryHtml,
} from "@/lib/server/study-summaries";

import { CopyableSummaryContent } from "./copyable-summary-content";
import { StudySummarySubscribeButton } from "./study-summary-subscribe-button";

const surfaceCardClass = "overflow-hidden border bg-card/95 shadow-sm dark:bg-gray-900/80";
const outlineButtonClass = "h-11 w-full rounded-lg sm:w-auto";

type SeoLite = { slug: string | null };

type SubjectDto = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  seo?: SeoLite;
  major: {
    id: string;
    name: string;
    code: string | null;
    degreeType: string | null;
    seo?: SeoLite;
    university: {
      id: string;
      name: string;
      code: string | null;
      countryCode: string | null;
      institutionType: string | null;
      visibility?: "country" | "global" | null;
      seo?: SeoLite;
    };
  };
};

function normalizeInstitutionType(value: string | null): InstitutionType | null {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "university" || normalized === "school" || normalized === "academy"
    ? (normalized as InstitutionType)
    : null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function fetchSubjectBySlugOrCode(subjectSlugRaw: string) {
  const subjectSlug = stripPrefix(subjectSlugRaw, "مواد");
  const bySlug = await fetchJSON<SubjectDto>(
    `/api/v1/student/subjects/by-slug/${encodeSlugPath(subjectSlug)}`,
    { cache: "no-store" },
    0,
  );
  if (bySlug.ok && bySlug.data) return { subject: bySlug.data };

  if (!subjectSlug.includes("/")) {
    const byCode = await fetchJSON<SubjectDto>(
      `/api/v1/student/subjects/by-code/${encodeURIComponent(subjectSlug)}`,
      { cache: "no-store" },
      0,
    );
    if (byCode.ok && byCode.data) return { subject: byCode.data };
  }

  return { subject: null as SubjectDto | null };
}

export async function StudySummaryDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
  subjectSlugPath,
  summarySlugPath,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  subjectSlugPath: string;
  summarySlugPath: string;
}) {
  const ccNorm = (cc || "SA").toUpperCase();
  const summarySlug = stripPrefix(summarySlugPath, "ملخصات");

  const { subject } = await fetchSubjectBySlugOrCode(subjectSlugPath);
  if (!subject || !summarySlug) notFound();

  const summary = await getPublishedSubjectSummaryBySlug(subject.id, summarySlug);
  if (!summary) notFound();

  const { session } = await getOrCreateAnonymousSession();
  const access = await checkStudySummaryAccess({ summaryId: summary.id, anonymousSessionId: session.id });
  if (access.reason === "not_found") notFound();
  const protectedContent = access.allowed ? await getPublishedStudySummaryContent(summary.id) : null;

  const canonicalUni = stripPrefix(subject.major.university?.seo?.slug || universitySlugPath, "جامعات");
  const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
  const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");
  const canonicalSummary = stripPrefix(summary.slug, "ملخصات");

  const currentUni = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");
  const currentSubject = stripPrefix(subjectSlugPath, "مواد");
  const currentSummary = stripPrefix(summarySlugPath, "ملخصات");

  const subjectCountry = (subject.major.university?.countryCode || "").toUpperCase();
  const subjectType = normalizeInstitutionType(subject.major.university?.institutionType || null);
  const isGlobalAcademy = subjectType === "academy" && subject.major.university?.visibility === "global";

  if (subjectType && subjectType !== type) {
    redirect(
      `/${isGlobalAcademy ? ccNorm : subjectCountry}/${subjectType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}/summaries/${encodeSlugPath(canonicalSummary)}`,
    );
  }

  if (subjectCountry && subjectType && !isGlobalAcademy && subjectCountry !== ccNorm) {
    redirect(
      `/${subjectCountry}/${subjectType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}/summaries/${encodeSlugPath(canonicalSummary)}`,
    );
  }

  if (
    canonicalUni !== currentUni ||
    canonicalMajor !== currentMajor ||
    canonicalSubject !== currentSubject ||
    canonicalSummary !== currentSummary
  ) {
    redirect(
      `/${ccNorm}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}/summaries/${encodeSlugPath(canonicalSummary)}`,
    );
  }

  const subjectLink = `/${ccNorm}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}/subjects/${encodeSlugPath(canonicalSubject)}`;
  const majorLink = `/${ccNorm}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(canonicalMajor)}`;
  const uniLink = `/${ccNorm}/${type}/universities/${encodeSlugPath(canonicalUni)}`;
  const hasReadableContent = Boolean(protectedContent?.contentHtml?.trim() || protectedContent?.contentText?.trim());
  const pdfDownloadHref = `/api/v1/student/summaries/${summary.id}/pdf`;

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className={surfaceCardClass}>
        <CardHeader className="px-5 text-center sm:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Link
              href={subjectLink}
              prefetch={false}
              className="rounded-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {subject.name}
            </Link>
            <span aria-hidden>/</span>
            <span>تفاصيل الملخص</span>
          </div>

          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpenText className="h-6 w-6" aria-hidden />
          </div>

          <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">{summary.title}</CardTitle>

          {summary.excerpt ? (
            <CardDescription className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {summary.excerpt}
            </CardDescription>
          ) : null}

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {summary.isFeatured ? (
              <Badge className="gap-1">
                <Star className="h-3.5 w-3.5" aria-hidden />
                مميز
              </Badge>
            ) : null}
            {summary.chapter ? (
              <Badge variant="outline" className="gap-1">
                <Layers3 className="h-3.5 w-3.5" aria-hidden />
                {summary.chapter.name}
              </Badge>
            ) : null}
            {summary.readingMinutes ? (
              <Badge variant="secondary" className="gap-1 arabic-numbers">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {summary.readingMinutes} د
              </Badge>
            ) : null}
            {summary.hasPdf && access.allowed ? (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                PDF
              </Badge>
            ) : null}
          </div>

          <Separator className="mx-auto my-4 max-w-md" />

          <div className="flex flex-wrap justify-center gap-3 text-sm leading-relaxed text-muted-foreground">
            <Link
              href={uniLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              {subject.major.university.name}
            </Link>
            <span>•</span>
            <Link
              href={majorLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              {subject.major.name}
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-5 pb-6 sm:px-6">
          {!access.allowed ? (
            <div className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50/70 p-5 text-center dark:border-amber-900/60 dark:bg-amber-950/25 sm:p-6">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-background text-amber-700 dark:text-amber-300">
                <Lock className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-lg font-bold text-foreground">هذا الملخص يحتاج اشتراكًا</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                يمكنك قراءة وصف الملخص ومعلوماته العامة، لكن المحتوى الكامل ورابط PDF لا يظهران إلا بعد تفعيل الوصول لهذا المتصفح.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <StudySummarySubscribeButton
                  access={access}
                  targetTitle={summary.title}
                  subjectId={access.subjectId ?? subject.id}
                  majorId={access.majorId ?? subject.major.id}
                />
                <Button asChild variant="outline" className={outlineButtonClass}>
                  <Link href={subjectLink} prefetch={false} className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4" aria-hidden />
                    الرجوع إلى المادة
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
          <div className="mx-auto max-w-3xl rounded-lg border bg-background/70 p-5 sm:p-6">
            {protectedContent?.contentHtml ? (
              <CopyableSummaryContent html={prepareTrustedSummaryHtml(protectedContent.contentHtml)} />
            ) : protectedContent?.contentText ? (
              <p className="whitespace-pre-line text-sm leading-8 text-muted-foreground sm:text-base">
                {protectedContent.contentText}
              </p>
            ) : (
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                هذا الملخص متاح كملف PDF فقط.
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {summary.hasPdf && access.allowed ? (
              <Button asChild className="h-11 rounded-lg sm:w-auto">
                <a href={pdfDownloadHref} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <Download className="h-4 w-4" aria-hidden />
                  فتح ملف PDF
                </a>
              </Button>
            ) : null}

            <Button asChild variant={hasReadableContent ? "outline" : "default"} className={outlineButtonClass}>
              <Link href={subjectLink} prefetch={false} className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4" aria-hidden />
                الرجوع إلى المادة
              </Link>
            </Button>
          </div>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground arabic-numbers">نشر في {formatDate(summary.publishedAt)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

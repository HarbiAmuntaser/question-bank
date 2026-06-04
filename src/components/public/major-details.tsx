// file: src/components/public/major-details.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { BookOpen, GraduationCap, University as UniversityIcon, Trophy } from "lucide-react";
import type { InstitutionType } from "@/config/regions";

import { MajorSubscriptionCallout } from "@/components/public/subscription-access";
import { CACHE_TAGS, cacheTags } from "@/lib/cache-tags";
import { fetchJSON } from "@/lib/server/student-fetch";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

export const revalidate = 21600;

const surfaceCardClass = "overflow-hidden border bg-card/95 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900/80";
const listCardClass =
  "group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80";
const actionButtonClass = "h-11 w-full rounded-lg text-sm sm:text-base";
const metaTileClass = "rounded-lg border bg-muted/30 px-4 py-3";

type SeoLite = { slug: string | null };

type SubjectDto = {
  id: string;
  name: string;
  code: string | null;
  creditHours: number | null;
  semester: number | null;
  year: number | null;
  description: string | null;
  seo?: SeoLite;
  _count?: { chapters?: number };
};

type UniversityLiteForMajor = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
  seo?: SeoLite;
  countryCode: string | null;
  institutionType: string | null; // قد تأتي كسلسلة من الـAPI
};

type MajorDto = {
  id: string;
  name: string;
  code: string | null;
  degreeType: string | null;
  durationYears: number | null;
  university: UniversityLiteForMajor;
  subjects: SubjectDto[];
  _count: { subjects: number; quizzes?: number };
  seo?: SeoLite;
};

type MajorDegreeOption = {
  id: string;
  name: string;
  code: string | null;
  degreeType: string | null;
};

function normalizeInstitutionType(v: string | null): InstitutionType | null {
  const x = (v || "").trim().toLowerCase();
  return x === "university" || x === "school" || x === "academy" ? (x as InstitutionType) : null;
}

function normalizeComparableText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDegreeLabel(value: string | null | undefined) {
  return (value ?? "").trim();
}

function degreeSortRank(value: string) {
  const label = value.toLowerCase();
  if (label.includes("بكالور") || label.includes("bachelor")) return 0;
  if (label.includes("دبلوم") || label.includes("diploma")) return 1;
  return 2;
}

async function fetchMajorBySlugOrCode(majorSlugPathRaw: string) {
  const majorSlugPath = stripPrefix(majorSlugPathRaw, "تخصصات");
  const bySlug = await fetchJSON<MajorDto>(
    `/api/v1/student/majors/by-slug/${encodeSlugPath(majorSlugPath)}`,
    { cache: "no-store" },
    0
  );
  if (bySlug.ok && bySlug.data) return { major: bySlug.data };

  if (!majorSlugPath.includes("/")) {
    const byCode = await fetchJSON<MajorDto>(
      `/api/v1/student/majors/by-code/${encodeURIComponent(majorSlugPath)}`,
      { cache: "no-store" },
      0
    );
    if (byCode.ok && byCode.data) return { major: byCode.data };

    const byId = await fetchJSON<MajorDto>(
      `/api/v1/student/majors/by-id/${encodeURIComponent(majorSlugPath)}`,
      { cache: "no-store" },
      0
    );
    if (byId.ok && byId.data) return { major: byId.data };
  }

  return { major: null as MajorDto | null };
}

async function fetchDegreeOptions(major: MajorDto) {
  try {
    const result = await fetchJSON<MajorDegreeOption[]>(
      `/api/v1/student/majors?universityId=${encodeURIComponent(major.university.id)}`,
      {
        next: {
          tags: cacheTags(
            "student-majors",
            CACHE_TAGS.public.majors,
            CACHE_TAGS.public.major(major.id),
            CACHE_TAGS.public.majorsByUniversity(major.university.id),
          ),
        },
      },
      3600,
    );

    if (!result.ok || !Array.isArray(result.data)) {
      return [];
    }

    const currentName = normalizeComparableText(major.name);
    const optionsByDegree = new Map<string, MajorDegreeOption>();

    for (const item of result.data) {
      if (normalizeComparableText(item.name) !== currentName) continue;

      const degree = normalizeDegreeLabel(item.degreeType);
      if (!degree) continue;

      const existing = optionsByDegree.get(degree);
      if (!existing || item.id === major.id) {
        optionsByDegree.set(degree, item);
      }
    }

    const currentDegree = normalizeDegreeLabel(major.degreeType);
    if (currentDegree && !optionsByDegree.has(currentDegree)) {
      optionsByDegree.set(currentDegree, {
        id: major.id,
        name: major.name,
        code: major.code,
        degreeType: major.degreeType,
      });
    }

    return Array.from(optionsByDegree.values()).sort((a, b) => {
      const aDegree = normalizeDegreeLabel(a.degreeType);
      const bDegree = normalizeDegreeLabel(b.degreeType);
      return degreeSortRank(aDegree) - degreeSortRank(bDegree) || aDegree.localeCompare(bDegree, "ar");
    });
  } catch {
    return [];
  }
}

function universityHref(cc: string, type: InstitutionType, uni: UniversityLiteForMajor) {
  const raw = (uni.seo?.slug || uni.code || uni.id || "").toString();
  const cleaned = stripPrefix(raw, "جامعات");
  return `/${cc}/${type}/universities/${encodeSlugPath(cleaned || uni.id)}`;
}

function subjectHrefHier(
  cc: string,
  type: InstitutionType,
  canonicalUni: string,
  canonicalMajor: string,
  s: SubjectDto
) {
  const raw = (s.seo?.slug || s.code || s.id || "").toString().trim();
  const subjectClean = stripPrefix(raw, "مواد").replace(/^\/+|\/+$/g, "");
  const subjectEnc = encodeSlugPath(subjectClean || s.id);

  return `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor
  )}/subjects/${subjectEnc}`;
}

function majorHrefHier(
  cc: string,
  type: InstitutionType,
  canonicalUni: string,
  canonicalMajor: string,
  currentMajorId: string,
  option: MajorDegreeOption,
) {
  if (option.id === currentMajorId) {
    return `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(canonicalMajor)}`;
  }

  return `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(option.id)}`;
}

export async function MajorDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
}) {
  const ccNorm = (cc || "SA").toUpperCase();
  const typeNorm = type;

  const { major } = await fetchMajorBySlugOrCode(majorSlugPath);
  if (!major) notFound();

  const canonicalMajor = stripPrefix(major.seo?.slug || majorSlugPath, "تخصصات");
  const canonicalUni = stripPrefix(major.university?.seo?.slug || universitySlugPath, "جامعات");

  const currentUni = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");

  const majorCC = (major.university?.countryCode || "").toUpperCase();
  const majorType = normalizeInstitutionType(major.university?.institutionType || null);

  // mismatch → redirect للمسار الصحيح
  if (majorCC && majorType && (majorCC !== ccNorm || majorType !== typeNorm)) {
    redirect(
      `/${majorCC}/${majorType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor
      )}`
    );
  }

  // canonical slug mismatch → redirect داخل نفس cc/type
  if (canonicalUni && canonicalUni !== currentUni) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor
      )}`
    );
  }

  if (canonicalMajor && canonicalMajor !== currentMajor) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor
      )}`
    );
  }

  const uniLink = universityHref(ccNorm, typeNorm, major.university);
  const subjects = Array.isArray(major.subjects) ? major.subjects : [];
  const degreeOptions = await fetchDegreeOptions(major);
  const currentDegree = normalizeDegreeLabel(major.degreeType);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Card */}
      <Card className={surfaceCardClass}>
        <CardHeader className="px-5 text-center sm:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Link
              href={uniLink}
              prefetch={false}
              className="rounded-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {major.university.name}
            </Link>
            <span aria-hidden>/</span>
            <span>تفاصيل التخصص</span>
          </div>

          <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">{major.name}</CardTitle>

          <CardDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base" dir="rtl">
            {major.degreeType ? major.degreeType : "تخصص"}
            {major.durationYears ? ` • ${major.durationYears} سنوات` : ""}
          </CardDescription>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            استعرض المواد والاختبارات المرتبطة بهذا التخصص واختر المسار المناسب للبدء.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm leading-relaxed text-muted-foreground">
            <Link
              href={uniLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <UniversityIcon className="h-4 w-4" aria-hidden />
              <span>{major.university.name}</span>
            </Link>

            {major.code ? <Badge variant="secondary">{major.code}</Badge> : null}
          </div>

          <Separator className="mx-auto my-4 max-w-md" />

          <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 text-base font-semibold sm:grid-cols-2 sm:text-lg">
            <div className={metaTileClass}>
              <span className="text-2xl sm:text-3xl font-bold arabic-numbers">
                {major._count?.subjects ?? subjects.length}
              </span>
              <span className="mt-1 block text-sm font-medium text-muted-foreground">مواد دراسية</span>
            </div>

            {typeof major._count?.quizzes === "number" ? (
              <div className={metaTileClass}>
                <span className="text-2xl sm:text-3xl font-bold arabic-numbers">
                  {major._count.quizzes}
                </span>
                <span className="mt-1 block text-sm font-medium text-muted-foreground">اختبارات متاحة</span>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex justify-center pt-0 pb-6">
          <Button asChild className="h-11 w-full rounded-lg sm:w-auto">
            <a href="#subjects-section" className="flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4" aria-hidden />
              عرض المواد
            </a>
          </Button>
        </CardContent>
      </Card>

      <MajorSubscriptionCallout majorId={major.id} title={major.name} />

      {degreeOptions.length > 0 ? (
        <Card className={surfaceCardClass}>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-2 text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="text-lg font-bold leading-tight sm:text-xl">نوع الدرجة</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                اختر درجة البرنامج لعرض المقررات المرتبطة بها ضمن هذا التخصص.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {degreeOptions.map((option) => {
                const optionDegree = normalizeDegreeLabel(option.degreeType);
                const isCurrent = option.id === major.id || optionDegree === currentDegree;

                return (
                  <Button
                    key={`${option.id}-${optionDegree}`}
                    asChild
                    variant={isCurrent ? "default" : "outline"}
                    className="h-11 rounded-lg text-sm sm:w-auto sm:text-base"
                  >
                    <Link
                      href={majorHrefHier(ccNorm, typeNorm, canonicalUni, canonicalMajor, major.id, option)}
                      prefetch={false}
                    >
                      {optionDegree}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Subjects Section */}
      <section id="subjects-section" className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold leading-tight sm:text-2xl">المواد الدراسية في هذا التخصص</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">اختر مادة لاستكشاف اختباراتِها</p>
        </div>

        {subjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
          {subjects.map((s) => {
            const chaptersCount = s._count?.chapters;
            const href = subjectHrefHier(ccNorm, typeNorm, canonicalUni, canonicalMajor, s);

            return (
              <Card
                key={s.id}
                className={listCardClass}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
                    {s.name}
                  </CardTitle>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.code ? <Badge variant="secondary" className="text-xs">{s.code}</Badge> : null}
                    {typeof s.creditHours === "number" ? (
                      <Badge variant="outline" className="text-xs">{s.creditHours} ساعات</Badge>
                    ) : null}
                    {typeof chaptersCount === "number" ? (
                      <Badge variant="outline" className="text-xs">{chaptersCount} فصول</Badge>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0 pb-6">
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {s.description || "لا يوجد وصف مختصر لهذه المادة حالياً."}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.semester ? `الفصل: ${s.semester}` : "—"}</span>
                    <span>{s.year ? `السنة: ${s.year}` : "—"}</span>
                  </div>

                  <Button asChild className={actionButtonClass}>
                    <Link href={href} prefetch={false} className="flex items-center justify-center gap-2">
                      <Trophy className="h-4 w-4" aria-hidden />
                      استكشاف الاختبارات
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-10">
          لا توجد مواد دراسية متاحة لهذا التخصص بعد.
        </div>
      )}
      </section>

      <div className="pt-2">
        <Button asChild variant="outline" className="h-11 w-full rounded-lg sm:w-auto">
          <Link href={uniLink} prefetch={false} className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" aria-hidden />
            الرجوع إلى الجامعة
          </Link>
        </Button>
      </div>
    </div>
  );
}

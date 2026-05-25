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

import { GraduationCap, University as UniversityIcon, Trophy } from "lucide-react";
import type { InstitutionType } from "@/config/regions";

import { fetchJSON } from "@/lib/server/student-fetch";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

export const revalidate = 300;

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

function normalizeInstitutionType(v: string | null): InstitutionType | null {
  const x = (v || "").trim().toLowerCase();
  return x === "university" || x === "school" || x === "academy" ? (x as InstitutionType) : null;
}

async function fetchMajorBySlugOrCode(majorSlugPathRaw: string) {
  const majorSlugPath = stripPrefix(majorSlugPathRaw, "تخصصات");

  const bySlug = await fetchJSON<MajorDto>(
    `/api/v1/student/majors/by-slug/${encodeSlugPath(majorSlugPath)}`
  );
  if (bySlug.ok && bySlug.data) return { major: bySlug.data };

  if (!majorSlugPath.includes("/")) {
    const byCode = await fetchJSON<MajorDto>(
      `/api/v1/student/majors/by-code/${encodeURIComponent(majorSlugPath)}`
    );
    if (byCode.ok && byCode.data) return { major: byCode.data };
  }

  return { major: null as MajorDto | null };
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

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Card */}
      <Card className="overflow-hidden border-2 bg-white/90 shadow-lg backdrop-blur-sm dark:bg-gray-800/90">
        <CardHeader className="px-5 text-center sm:px-6">
          <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">{major.name}</CardTitle>

          <CardDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base" dir="rtl">
            {major.degreeType ? major.degreeType : "تخصص"}
            {major.durationYears ? ` • ${major.durationYears} سنوات` : ""}
          </CardDescription>

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

          <div className="flex justify-center gap-6 text-base font-semibold sm:gap-8 sm:text-lg">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold arabic-numbers">
                {major._count?.subjects ?? subjects.length}
              </span>
              <span className="text-muted-foreground">مواد</span>
            </div>

            {typeof major._count?.quizzes === "number" ? (
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-bold arabic-numbers">
                  {major._count.quizzes}
                </span>
                <span className="text-muted-foreground">اختبارات</span>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6" />
      </Card>

      {/* Subjects Section */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">المواد الدراسية في هذا التخصص</h2>
        <p className="text-muted-foreground mt-1">اختر مادة لاستكشاف اختباراتِها</p>
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
          {subjects.map((s) => {
            const chaptersCount = s._count?.chapters;
            const href = subjectHrefHier(ccNorm, typeNorm, canonicalUni, canonicalMajor, s);

            return (
              <Card
                key={s.id}
                className="group flex h-full flex-col overflow-hidden border-2 bg-white/90 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-xl dark:bg-gray-800/90"
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

                  <Button asChild className="h-11 w-full rounded-xl text-sm sm:text-base">
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

      <div className="pt-2">
        <Button asChild variant="outline" className="h-11 w-full rounded-xl sm:w-auto">
          <Link href={uniLink} prefetch={false} className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" aria-hidden />
            الرجوع إلى الجامعة
          </Link>
        </Button>
      </div>
    </div>
  );
}

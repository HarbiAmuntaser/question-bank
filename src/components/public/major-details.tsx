// file: src/components/public/major-details.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ArrowRight, BookOpen } from "lucide-react";
import type { InstitutionType } from "@/config/regions";

import { MajorSubscriptionCallout } from "@/components/public/subscription-access";
import { PublicSubjectCard } from "@/components/public/public-subject-card";
import {
  compareAcademicPeriods,
  getAcademicPeriodLabel,
  getAcademicPeriodRouteKey,
  isValidAcademicPeriod,
  type AcademicPeriod,
} from "@/lib/academic-periods";
import { getPublicMajorByRouteKey } from "@/lib/server/public-education-loaders";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

export const revalidate = 21600;

const surfaceCardClass = "overflow-hidden border bg-card/95 shadow-sm";
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
  institutionType: string | null;
  visibility?: "country" | "global" | null;
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

async function fetchMajorBySlugOrCode(majorSlugPathRaw: string): Promise<{ major: MajorDto | null }> {
  return { major: await getPublicMajorByRouteKey(majorSlugPathRaw) };
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
  s: SubjectDto,
) {
  const raw = (s.seo?.slug || s.code || s.id || "").toString().trim();
  const subjectClean = stripPrefix(raw, "مواد").replace(/^\/+|\/+$/g, "");
  const subjectEnc = encodeSlugPath(subjectClean || s.id);

  return `/${cc}/${type}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}/subjects/${subjectEnc}`;
}

function groupSubjectsByAcademicPeriod(subjects: SubjectDto[]) {
  const groups = new Map<string, { period: AcademicPeriod; subjects: SubjectDto[] }>();
  const unassigned: SubjectDto[] = [];

  for (const subject of subjects) {
    if (!isValidAcademicPeriod(subject)) {
      unassigned.push(subject);
      continue;
    }

    const period = { year: subject.year, semester: subject.semester };
    const key = getAcademicPeriodRouteKey(period);
    const group = groups.get(key) ?? { period, subjects: [] };
    group.subjects.push(subject);
    groups.set(key, group);
  }

  return {
    groups: Array.from(groups.values()).sort((a, b) => compareAcademicPeriods(a.period, b.period)),
    unassigned,
  };
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
  const isGlobalAcademy = majorType === "academy" && major.university?.visibility === "global";

  if (majorType && majorType !== typeNorm) {
    redirect(
      `/${isGlobalAcademy ? ccNorm : majorCC}/${majorType}/universities/${encodeSlugPath(
        canonicalUni,
      )}/majors/${encodeSlugPath(canonicalMajor)}`,
    );
  }

  if (majorCC && majorType && !isGlobalAcademy && majorCC !== ccNorm) {
    redirect(
      `/${majorCC}/${majorType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}`,
    );
  }

  if (canonicalUni && canonicalUni !== currentUni) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}`,
    );
  }

  if (canonicalMajor && canonicalMajor !== currentMajor) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}`,
    );
  }

  const uniLink = universityHref(ccNorm, typeNorm, major.university);
  const subjects = Array.isArray(major.subjects) ? major.subjects : [];
  const academicCatalog = groupSubjectsByAcademicPeriod(subjects);
  const showAcademicLevels = typeNorm === "university" && academicCatalog.groups.length > 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className={surfaceCardClass}>
        <CardHeader className="space-y-5 px-5 text-center sm:px-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-foreground/70">تفاصيل التخصص</div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{major.name}</h1>
          </div>

          <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 text-base font-semibold sm:grid-cols-2 sm:text-lg">
            <div className={metaTileClass}>
              <span className="text-2xl font-bold sm:text-3xl arabic-numbers">
                {major._count?.subjects ?? subjects.length}
              </span>
              <span className="mt-1 block text-sm font-medium text-foreground/70">مواد متاحة</span>
            </div>

            {typeof major._count?.quizzes === "number" ? (
              <div className={metaTileClass}>
                <span className="text-2xl font-bold sm:text-3xl arabic-numbers">{major._count.quizzes}</span>
                <span className="mt-1 block text-sm font-medium text-foreground/70">اختبارات متاحة</span>
              </div>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <MajorSubscriptionCallout majorId={major.id} title={major.name} />

      <section id="subjects-section" className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold leading-tight sm:text-2xl">
            {showAcademicLevels ? "المستويات الدراسية" : "المواد المتاحة"}
          </h2>
        </div>

        {showAcademicLevels ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
              {academicCatalog.groups.map(({ period, subjects: periodSubjects }) => {
                const routeKey = getAcademicPeriodRouteKey(period);
                const href = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
                  canonicalMajor,
                )}/levels/${routeKey}`;

                return (
                  <Card key={routeKey} className="group flex h-full flex-col border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" aria-hidden />
                      </div>
                      <h3 className="text-lg font-semibold leading-snug">
                        {getAcademicPeriodLabel(major.university.countryCode || ccNorm, period)}
                      </h3>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-4 pb-6 pt-0">
                      <p className="text-sm font-medium text-foreground/75">
                        {periodSubjects.length} {periodSubjects.length === 1 ? "مادة" : "مواد"}
                      </p>
                      <Button asChild className="h-11 w-full rounded-lg text-sm sm:text-base">
                        <Link href={href} prefetch={false}>
                          عرض مواد المستوى
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {academicCatalog.unassigned.length > 0 ? (
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-lg font-semibold">مواد غير مصنفة</h3>
                  <p className="mt-1 text-sm text-foreground/70">مواد قديمة لم تُسند إلى سنة وفصل دراسيين بعد.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
                  {academicCatalog.unassigned.map((subject) => (
                    <PublicSubjectCard
                      key={subject.id}
                      href={subjectHrefHier(ccNorm, typeNorm, canonicalUni, canonicalMajor, subject)}
                      name={subject.name}
                      description={subject.description}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : subjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
            {subjects.map((s) => {
              const href = subjectHrefHier(ccNorm, typeNorm, canonicalUni, canonicalMajor, s);

              return (
                <PublicSubjectCard key={s.id} href={href} name={s.name} description={s.description} />
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-foreground/70">لا توجد مواد متاحة لهذا التخصص بعد.</div>
        )}
      </section>

      <div className="pt-2">
        <Button asChild variant="outline" className="h-11 w-full rounded-lg sm:w-auto">
          <Link href={uniLink} prefetch={false} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" aria-hidden />
            الرجوع إلى المؤسسة
          </Link>
        </Button>
      </div>
    </div>
  );
}

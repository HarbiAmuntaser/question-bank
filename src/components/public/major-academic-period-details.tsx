import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PublicSubjectCard } from "@/components/public/public-subject-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { InstitutionType } from "@/config/regions";
import {
  getAcademicPeriodLabel,
  getAcademicPeriodRouteKey,
  parseAcademicPeriodRouteKey,
} from "@/lib/academic-periods";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { getPublicMajorByRouteKey } from "@/lib/server/public-education-loaders";

type SubjectDto = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  semester: number | null;
  year: number | null;
  seo?: { slug: string | null };
};

type MajorDto = {
  id: string;
  name: string;
  code: string | null;
  seo?: { slug: string | null };
  subjects: SubjectDto[];
  university: {
    id: string;
    code: string | null;
    countryCode: string | null;
    institutionType: string | null;
    seo?: { slug: string | null };
  };
};

async function fetchMajorBySlugOrCode(majorSlugPathRaw: string): Promise<MajorDto | null> {
  return getPublicMajorByRouteKey(majorSlugPathRaw);
}

function subjectHref(
  cc: string,
  canonicalUniversity: string,
  canonicalMajor: string,
  subject: SubjectDto,
) {
  const raw = (subject.seo?.slug || subject.code || subject.id).toString();
  const canonicalSubject = stripPrefix(raw, "مواد") || subject.id;
  return `/${cc}/university/universities/${encodeSlugPath(canonicalUniversity)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}/subjects/${encodeSlugPath(canonicalSubject)}`;
}

export async function MajorAcademicPeriodDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
  periodRouteKey,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  periodRouteKey: string;
}) {
  if (type !== "university") notFound();

  const period = parseAcademicPeriodRouteKey(periodRouteKey);
  if (!period) notFound();

  const major = await fetchMajorBySlugOrCode(majorSlugPath);
  if (!major || major.university.institutionType !== "university") notFound();

  const ccNorm = cc.toUpperCase();
  const universityCountry = (major.university.countryCode || "").toUpperCase();
  const canonicalUniversity = stripPrefix(
    major.university.seo?.slug || major.university.code || universitySlugPath,
    "جامعات",
  );
  const canonicalMajor = stripPrefix(major.seo?.slug || major.code || majorSlugPath, "تخصصات");
  const canonicalPeriod = getAcademicPeriodRouteKey(period);
  const canonicalPath = `/${universityCountry || ccNorm}/university/universities/${encodeSlugPath(
    canonicalUniversity,
  )}/majors/${encodeSlugPath(canonicalMajor)}/levels/${canonicalPeriod}`;

  const currentUniversity = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");
  if (
    (universityCountry && universityCountry !== ccNorm) ||
    currentUniversity !== canonicalUniversity ||
    currentMajor !== canonicalMajor ||
    periodRouteKey !== canonicalPeriod
  ) {
    redirect(canonicalPath);
  }

  const subjects = (major.subjects ?? []).filter(
    (subject) => subject.year === period.year && subject.semester === period.semester,
  );
  if (subjects.length === 0) notFound();

  const majorPath = `/${ccNorm}/university/universities/${encodeSlugPath(
    canonicalUniversity,
  )}/majors/${encodeSlugPath(canonicalMajor)}`;
  const label = getAcademicPeriodLabel(universityCountry || ccNorm, period);

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className="overflow-hidden border bg-card/95 shadow-sm dark:bg-gray-900/80">
        <CardHeader className="space-y-4 px-5 text-center sm:px-6">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground/70">{major.name}</p>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{label}</h1>
            <p className="text-sm font-medium text-foreground/75">
              {subjects.length} {subjects.length === 1 ? "مادة متاحة" : "مواد متاحة"}
            </p>
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-5" aria-labelledby="academic-period-subjects-heading">
        <h2 id="academic-period-subjects-heading" className="text-center text-xl font-bold leading-tight sm:text-2xl">
          مواد {label}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
          {subjects.map((subject) => (
            <PublicSubjectCard
              key={subject.id}
              href={subjectHref(ccNorm, canonicalUniversity, canonicalMajor, subject)}
              name={subject.name}
              description={subject.description}
            />
          ))}
        </div>
      </section>

      <Button asChild variant="outline" className="h-11 w-full rounded-lg sm:w-auto">
        <Link href={majorPath} prefetch={false} className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4" aria-hidden />
          الرجوع إلى التخصص
        </Link>
      </Button>
    </div>
  );
}

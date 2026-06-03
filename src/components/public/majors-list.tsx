import Link from "next/link";
import { BookOpenCheck, Clock, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

import type { MajorPublicLite } from "@/types/public-university";

type InstType = "university" | "school" | "academy";

const listCardClass =
  "group relative flex h-full flex-col overflow-hidden border bg-card/95 p-5 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80";

interface MajorsListProps {
  cc: string;
  type: InstType;
  universitySlug: string;
  majors: MajorPublicLite[];
}

function encodeSlugPath(slugPath: string) {
  return (slugPath || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

function stripPrefix(raw: string, prefixAr: string) {
  return (raw || "")
    .trim()
    .replace(new RegExp(`^${prefixAr}\\s*\\/\\s*`, "u"), "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function getProgramLabel(type: InstType) {
  if (type === "school") return "مسار مدرسي";
  if (type === "academy") return "برنامج تدريبي";
  return "برنامج أكاديمي";
}

export function MajorsList({ majors, cc, type, universitySlug }: MajorsListProps) {
  const ccNorm = (cc || "SA").trim().toUpperCase();
  const typeNorm = (type || "university").trim().toLowerCase() as InstType;
  const programLabel = getProgramLabel(typeNorm);

  const uniSlugClean = stripPrefix(universitySlug, "جامعات");
  const uniEncoded = encodeSlugPath(uniSlugClean);

  const hrefFor = (m: MajorPublicLite) => {
    const raw = (m.seo?.slug || m.code || m.id || "").toString();
    const majorClean = stripPrefix(raw, "تخصصات");
    const majorEncoded = encodeSlugPath(majorClean || m.id);
    return `/${ccNorm}/${typeNorm}/universities/${uniEncoded}/majors/${majorEncoded}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6">
      {majors.map((major) => {
        const subjectsCount = major._count?.subjects;
        const hasSubjectsCount = typeof subjectsCount === "number";

        return (
          <Card key={major.id} className={listCardClass}>
            <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" aria-hidden />

            <CardContent className="flex h-full flex-col gap-5 p-0">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  aria-hidden
                >
                  <GraduationCap className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    >
                      {programLabel}
                    </Badge>
                    {major.code ? (
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1 text-[11px]"
                        dir="ltr"
                      >
                        {major.code}
                      </Badge>
                    ) : null}
                  </div>

                  <CardTitle className="line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-xl">
                    {major.name}
                  </CardTitle>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {major.degreeType ? (
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {major.degreeType}
                  </Badge>
                ) : null}
                {hasSubjectsCount ? (
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {subjectsCount} مقرر
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                {major.durationYears ? (
                  <>
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="arabic-numbers">
                      مدة الدراسة: {major.durationYears} سنوات
                    </span>
                  </>
                ) : (
                  <>
                    <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>مواد واختبارات مرتبطة بهذا المسار.</span>
                  </>
                )}
              </div>

              <Button asChild className="mt-auto h-11 w-full rounded-lg text-sm sm:text-base">
                <Link href={hrefFor(major)} prefetch={false} className="focus-visible:outline-none">
                  استعرض مواد التخصص
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

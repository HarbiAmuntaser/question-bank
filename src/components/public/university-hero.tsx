import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, MapPin } from "lucide-react";

import type { UniversityPublicLite } from "@/types/public-university";

interface UniversityHeroProps {
  university: UniversityPublicLite;
}

export function UniversityHero({ university }: UniversityHeroProps) {
  const majors = Array.isArray(university.majors) ? university.majors : [];

  const createdYear = (() => {
    if (!university.createdAt) return "—";
    const d =
      typeof university.createdAt === "string"
        ? new Date(university.createdAt)
        : university.createdAt;
    const t = typeof d?.getTime === "function" ? d.getTime() : NaN;
    if (!Number.isFinite(t)) return "—";
    return d.getFullYear();
  })();

  const firstLetter = university.name?.trim()?.charAt(0) || "U";

  return (
    <section className="container py-6 sm:py-8 lg:py-12">
      <Card className="overflow-hidden border bg-card/95 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900/80">
        <CardContent className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col items-start gap-5 sm:gap-6 lg:flex-row lg:items-center lg:gap-8">
            {/* الشعار + معلومات أساسية */}
            <div className="flex w-full items-start gap-4 sm:items-center sm:gap-6">
              <Avatar className="h-16 w-16 shrink-0 sm:h-24 sm:w-24">
                {/* Phase 1: use a local logo placeholder until hosted institution logos are ready. */}
                <AvatarImage src="/images/institutions/default.svg" alt={university.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {firstLetter}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>المؤسسات التعليمية</span>
                  <span aria-hidden>/</span>
                  <span>تفاصيل المؤسسة</span>
                </div>

                <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">
                  {university.name}
                </h1>

                <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  استعرض التخصصات والمقررات والاختبارات المتاحة لهذه المؤسسة في مكان واحد.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {university.code ? (
                    <Badge variant="secondary">{university.code}</Badge>
                  ) : null}

                  <Badge className="border bg-background/80 text-foreground" variant="outline">
                    {majors.length} تخصص
                  </Badge>

                  <Badge className="border bg-background/80 text-foreground" variant="outline">
                    تأسست: {createdYear}
                  </Badge>
                </div>

                {(university.city || university.region) && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      {university.city && university.region
                        ? `${university.city}، ${university.region}`
                        : university.city || university.region}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <Button asChild className="h-11 w-full rounded-lg px-5 sm:w-auto">
                <a href="#majors-section" className="flex items-center justify-center gap-2">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  عرض التخصصات
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { UniversityPublicLite } from "@/types/public-university";

interface UniversityHeroProps {
  university: UniversityPublicLite;
}

export function UniversityHero({ university }: UniversityHeroProps) {
  const firstLetter = university.name?.trim()?.charAt(0) || "U";
  const institutionType = university.institutionType ?? "university";
  const location = Array.from(
    new Set([university.city, university.region].map((value) => value?.trim()).filter(Boolean)),
  ).join("، ");
  const copy =
    institutionType === "academy"
      ? {
          eyebrow: "تفاصيل المسار التدريبي",
          description: "استعرض البرامج والمهارات والاختبارات والملخصات المتاحة ضمن هذا المسار التدريبي.",
        }
      : institutionType === "school"
        ? {
            eyebrow: "تفاصيل المدرسة",
            description: "استعرض المسارات الدراسية والمواد والاختبارات المتاحة داخل هذه المدرسة.",
          }
        : {
            eyebrow: "تفاصيل الجامعة",
            description: "استعرض التخصصات والمستويات الدراسية والمقررات والاختبارات المتاحة داخل هذه الجامعة.",
          };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <Card className="overflow-hidden border bg-card/95 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900/80">
        <CardContent className="p-5 sm:p-6 lg:p-8">
          <div className="flex items-start gap-4 sm:items-center sm:gap-6">
            <Avatar className="h-16 w-16 shrink-0 sm:h-24 sm:w-24">
              {university.logoUrl?.trim() ? (
                <AvatarImage
                  src={university.logoUrl.trim()}
                  alt={`شعار ${university.name}`}
                  className="bg-white object-contain p-1.5"
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {firstLetter}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="mb-2 text-xs font-medium text-foreground/70">{copy.eyebrow}</div>

              <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                {university.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
                {copy.description}
              </p>

              {location || university.code?.trim() ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {location ? (
                    <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {location}
                    </Badge>
                  ) : null}
                  {university.code?.trim() ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs" dir="ltr">
                      {university.code.trim()}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

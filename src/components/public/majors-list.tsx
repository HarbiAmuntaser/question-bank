import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Clock } from "lucide-react";

import type { MajorPublicLite } from "@/types/public-university";

type InstType = "university" | "school" | "academy";

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

export function MajorsList({ majors, cc, type, universitySlug }: MajorsListProps) {
  const ccNorm = (cc || "SA").trim().toUpperCase();
  const typeNorm = (type || "university").trim().toLowerCase() as InstType;

  const uniSlugClean = stripPrefix(universitySlug, "جامعات");
  const uniEncoded = encodeSlugPath(uniSlugClean);

  const hrefFor = (m: MajorPublicLite) => {
    const raw = (m.seo?.slug || m.code || m.id || "").toString();
    const majorClean = stripPrefix(raw, "تخصصات");
    const majorEncoded = encodeSlugPath(majorClean || m.id);
    return `/${ccNorm}/${typeNorm}/universities/${uniEncoded}/majors/${majorEncoded}`;
  };

  // ✅ نفس نمط بطاقات الصفحة الرئيسية: خفيف ومرتب للجوال/آيباد
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
      {majors.map((major) => (
        <Card
          key={major.id}
          className="group flex h-full flex-col overflow-hidden border-2 bg-white/90 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-xl dark:bg-gray-800/90"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-4">
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {(major.name?.trim()?.charAt(0) || "T").toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <CardTitle className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
                  {major.name}
                </CardTitle>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {major.code ? <Badge variant="secondary" className="text-xs">{major.code}</Badge> : null}
                  {major.degreeType ? <Badge variant="outline" className="text-xs">{major.degreeType}</Badge> : null}
                  <Badge variant="outline" className="text-xs">
                    {major._count?.subjects ?? 0} مقرر
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0 pb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              {major.durationYears ? (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 ml-1" aria-hidden />
                  <span className="arabic-numbers">{major.durationYears} سنوات</span>
                </div>
              ) : (
                <span />
              )}
            </div>

            <Button asChild className="h-11 w-full rounded-xl text-sm sm:text-base">
              <Link href={hrefFor(major)} prefetch={false} className="focus-visible:outline-none">
                استكشف المقررات
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// file: src/components/public/university-grid/institution-card.tsx

import Link from "next/link";
import { BookOpen, Landmark, MapPin, Route, School } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { InstType } from "./types";

type Props = {
  name: string;
  href: string;
  type: InstType;
  logoUrl: string | null;
  code: string | null;
  city?: string | null;
  region?: string | null;
  majorCount?: number | null;
  quizCount?: number | null;
  ctaText: string;
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function getInstitutionCopy(type: InstType) {
  if (type === "academy") {
    return {
      typeLabel: "مسار تدريبي",
      programsLabel: "البرامج",
      emptyText: "استكشف البرامج والمهارات والاختبارات المتاحة داخل هذا المسار التدريبي.",
      Icon: Route,
    };
  }

  if (type === "school") {
    return {
      typeLabel: "مدرسة",
      programsLabel: "المسارات",
      emptyText: "استكشف المسارات والمواد والاختبارات المتاحة داخل هذه المدرسة.",
      Icon: School,
    };
  }

  return {
    typeLabel: "جامعة",
    programsLabel: "التخصصات",
    emptyText: "استكشف التخصصات والمقررات والاختبارات المتاحة داخل هذه الجامعة.",
    Icon: Landmark,
  };
}

export function InstitutionGridCard({
  name,
  href,
  type,
  logoUrl,
  code,
  city,
  region,
  majorCount,
  quizCount,
  ctaText,
}: Props) {
  const { typeLabel, programsLabel, emptyText, Icon } = getInstitutionCopy(type);
  const location = Array.from(new Set([city, region].map((value) => value?.trim()).filter(Boolean))).join("، ");
  const hasStats = typeof majorCount === "number" || typeof quizCount === "number";

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border bg-card/95 p-5 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" aria-hidden />

      <CardContent className="flex h-full flex-col gap-5 p-0">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-xl border bg-background">
            {logoUrl?.trim() ? (
              <AvatarImage src={logoUrl.trim()} alt={`شعار ${name}`} className="bg-white object-contain p-1" />
            ) : null}
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs font-semibold">
                {typeLabel}
              </Badge>
              {code?.trim() ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs" dir="ltr">
                  {code.trim()}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-xl">
              {name}
            </CardTitle>
            {location ? (
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground/75">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="line-clamp-1">{location}</span>
              </div>
            ) : null}
          </div>
        </div>

        {hasStats ? (
          <div className="grid grid-cols-2 gap-3">
            {typeof majorCount === "number" ? <StatPill label={programsLabel} value={majorCount} /> : null}
            {typeof quizCount === "number" ? <StatPill label="الاختبارات" value={quizCount} /> : null}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm font-medium leading-6 text-foreground/75">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {emptyText}
          </div>
        )}

        <Button asChild className="mt-auto h-11 w-full rounded-lg text-sm sm:text-base">
          <Link href={href} prefetch={false} className="flex items-center justify-center">
            {ctaText}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// file: src/components/public/home-main/institutions-preview/preview-card.tsx

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Building2, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { getFallbackImageSrc } from "./utils";

type PreviewMajor = {
  id: string;
  name: string;
};

type Props = {
  name: string;
  logoUrl?: string | null;
  code?: string | null;
  city?: string | null;
  region?: string | null;
  href: string;
  variant?: "default" | "featured" | "compact";
  majorCount?: number | null;
  quizCount?: number | null;
  majors?: PreviewMajor[];
};

export function InstitutionPreviewCard({
  name,
  code,
  city,
  region,
  href,
  variant = "default",
  majorCount,
  quizCount,
  majors = [],
}: Props) {
  // Keep imagery local and stable until real hosted institution logos are ready.
  const imageSrc = getFallbackImageSrc(code);
  const location = [city, region].filter(Boolean).join("، ");
  const shownMajors = majors
    .filter((major) => major.name)
    .slice(0, variant === "featured" ? 3 : 2);

  if (variant !== "default") {
    return (
      <DirectoryInstitutionCard
        name={name}
        code={code}
        location={location}
        href={href}
        variant={variant}
        majorCount={majorCount}
        quizCount={quizCount}
        shownMajors={shownMajors}
      />
    );
  }

  return (
    <Card className="group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md">
      <div className="relative h-36 overflow-hidden sm:h-44">
        <div className="absolute inset-0 bg-muted/30" aria-hidden />

        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <div className="absolute right-3 top-3">
          <Badge className="rounded-md bg-background/90 text-foreground shadow-sm">
            <Star className="ml-1 h-3 w-3 text-[hsl(var(--brand-amber))]" aria-hidden />
            موصى بها
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg font-bold leading-snug transition-colors hover:text-primary sm:text-xl">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {location ? (
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/70">
            <MapPin className="h-4 w-4" aria-hidden />
            <span className="line-clamp-1">{location}</span>
          </div>
        ) : (
          <div className="text-sm font-medium text-foreground/75">
            استكشف المحتوى المتاح داخل هذه المؤسسة.
          </div>
        )}

        <Button asChild className="h-11 w-full rounded-lg text-sm sm:text-base">
          <Link href={href} prefetch={false} className="flex items-center justify-center">
            استكشف
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DirectoryInstitutionCard({
  name,
  code,
  location,
  href,
  variant,
  majorCount,
  quizCount,
  shownMajors,
}: {
  name: string;
  code?: string | null;
  location: string;
  href: string;
  variant: "featured" | "compact";
  majorCount?: number | null;
  quizCount?: number | null;
  shownMajors: PreviewMajor[];
}) {
  const isFeatured = variant === "featured";

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md",
        isFeatured ? "p-5 sm:p-6 lg:p-7" : "p-5",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" aria-hidden />

      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
              isFeatured ? "h-14 w-14" : "h-12 w-12",
            )}
            aria-hidden
          >
            <Building2 className={cn(isFeatured ? "h-7 w-7" : "h-6 w-6")} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              >
                دليل جامعي
              </Badge>
              {code ? (
                <Badge
                  variant="outline"
                  className="rounded-full px-2.5 py-1 text-[11px]"
                  dir="ltr"
                >
                  {code}
                </Badge>
              ) : null}
            </div>

            <CardTitle
              className={cn(
                "line-clamp-2 font-bold leading-snug transition-colors group-hover:text-primary",
                isFeatured ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
              )}
            >
              {name}
            </CardTitle>

            {location ? (
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground/70">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span className="line-clamp-1">{location}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground/70">التخصصات</p>
            <p className="mt-1 text-xl font-bold text-foreground">{majorCount ?? "-"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground/70">الاختبارات</p>
            <p className="mt-1 text-xl font-bold text-foreground">{quizCount ?? "-"}</p>
          </div>
        </div>

        {shownMajors.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
              <BookOpen className="h-4 w-4" aria-hidden />
              تخصصات بارزة
            </div>
            <div className="flex flex-wrap gap-2">
              {shownMajors.map((major) => (
                <span
                  key={major.id}
                  className="line-clamp-1 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground/75"
                >
                  {major.name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium leading-7 text-foreground/75">
            استكشف التخصصات والمقررات والاختبارات المتاحة داخل هذه الجامعة.
          </p>
        )}

        <Button asChild className="mt-auto h-11 w-full rounded-lg text-sm sm:text-base">
          <Link href={href} prefetch={false} className="flex items-center justify-center">
            استعرض التخصصات
          </Link>
        </Button>
      </div>
    </Card>
  );
}

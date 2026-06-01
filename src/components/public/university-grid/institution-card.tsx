// file: src/components/public/university-grid/institution-card.tsx

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Star } from "lucide-react";

type Props = {
  name: string;
  href: string;
  logoUrl: string | null;
  code: string | null;
  badgeText: string;
  badgeAria: string;
  ctaText: string;
};

export function InstitutionGridCard({
  name,
  href,
  badgeText,
  badgeAria,
  ctaText,
}: Props) {
  // Phase 1: one local placeholder avoids external logo misses and image 404s.
  const imgSrc = "/images/institutions/default.svg";

  return (
    <Card className="group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80">
      <div className="relative h-40 overflow-hidden sm:h-44">
        <div className="absolute inset-0 bg-muted/30" aria-hidden />
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <div className="absolute right-3 top-3">
          <Badge className="rounded-md bg-background/90 text-foreground shadow-sm" aria-label={badgeAria}>
            <Star className="ml-1 h-3 w-3 text-yellow-500" aria-hidden />
            {badgeText}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-primary dark:text-white sm:text-xl">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="mt-auto pb-6">
        <Button
          asChild
          className="h-11 w-full rounded-lg text-sm sm:text-base"
        >
          <Link href={href} prefetch={false} className="flex items-center justify-center gap-2">
            <GraduationCap className="h-5 w-5" aria-hidden />
            {ctaText}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

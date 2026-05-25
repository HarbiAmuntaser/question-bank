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
    <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden">
      {/* صورة */}
      <div className="relative h-44 sm:h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-blue-600/20 to-purple-600/20" aria-hidden />
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <div className="absolute top-4 right-4">
          <Badge className="bg-white/90 text-gray-900 shadow-lg" aria-label={badgeAria}>
            <Star className="w-3 h-3 ml-1 text-yellow-500" aria-hidden />
            {badgeText}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-6">
        <Button
          asChild
          className="w-full h-11 sm:h-12 rounded-xl shadow-lg bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
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

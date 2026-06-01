// file: src/components/public/home-main/institutions-preview/preview-card.tsx

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, MapPin, Star } from "lucide-react";
import { getFallbackImageSrc } from "./utils";

type Props = {
  name: string;
  logoUrl?: string | null;
  code?: string | null;
  city?: string | null;
  region?: string | null;
  href: string;
};

export function InstitutionPreviewCard({
  name,
  code,
  city,
  region,
  href,
}: Props) {
  // Phase 1: keep institution imagery local and stable until hosted logos are ready.
  const imageSrc = getFallbackImageSrc(code);

  const location = [city, region].filter(Boolean).join(" • ");

  return (
    <Card className="group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80">
      <div className="relative h-36 overflow-hidden sm:h-44">
        <div
          className="absolute inset-0 bg-muted/30"
          aria-hidden
        />

        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <div className="absolute right-3 top-3">
          <Badge className="rounded-md bg-background/90 text-foreground shadow-sm">
            <Star className="ml-1 h-3 w-3 text-yellow-500" aria-hidden />
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
        {/* ✅ بدل الإحصاءات: سطر خفيف للموقع/المنطقة إن وجد */}
        {location ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden />
            <span className="line-clamp-1">{location}</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">استكشف المحتوى المتاح داخل هذه المؤسسة.</div>
        )}

        {/* زر الاستكشاف */}
        <Button
          asChild
          className="h-11 w-full rounded-lg text-sm sm:text-base"
        >
          <Link href={href} prefetch={false} className="flex items-center justify-center gap-2">
            <GraduationCap className="h-5 w-5" aria-hidden />
            استكشف
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

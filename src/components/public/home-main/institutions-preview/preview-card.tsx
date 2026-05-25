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
    <Card className="h-full border-2 transition-all duration-300 shadow-md hover:shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden hover:border-primary/40">
      {/* صورة */}
      <div className="relative h-36 sm:h-44 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-green-600/15 via-blue-600/15 to-purple-600/15"
          aria-hidden
        />

        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 will-change-transform hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <div className="absolute top-3 right-3">
          <Badge className="bg-white/90 text-gray-900 shadow-sm">
            <Star className="w-3 h-3 ml-1 text-yellow-500" aria-hidden />
            موصى بها
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg sm:text-xl font-bold leading-snug hover:text-primary transition-colors">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
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
          className="w-full h-11 sm:h-12 rounded-xl shadow-sm bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
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

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { UniversityPublicLite } from "@/types/public-university";

interface UniversityHeroProps {
  university: UniversityPublicLite;
}

export function UniversityHero({ university }: UniversityHeroProps) {
  const firstLetter = university.name?.trim()?.charAt(0) || "U";

  return (
    <section className="container py-5 sm:py-6 lg:py-8">
      <Card className="overflow-hidden border bg-card/95 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900/80">
        <CardContent className="p-5 sm:p-6 lg:p-8">
          <div className="flex items-start gap-4 sm:items-center sm:gap-6">
            <Avatar className="h-16 w-16 shrink-0 sm:h-24 sm:w-24">
              <AvatarImage src="/images/institutions/default.svg" alt={university.name} />
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {firstLetter}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="mb-2 text-xs font-medium text-foreground/70">تفاصيل المسار</div>

              <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                {university.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
                استعرض التخصصات والمقررات والاختبارات المتاحة ضمن هذا المسار في مكان واحد.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

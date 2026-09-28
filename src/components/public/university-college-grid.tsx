import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { CollegePublicLite } from "@/types/public-university";

type Props = { basePath: string; colleges: CollegePublicLite[]; degree?: string | null };

export function UniversityCollegeGrid({ basePath, colleges, degree }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {colleges.map((college) => {
        const query = degree ? `?degree=${encodeURIComponent(degree)}` : "";
        const href = `${basePath}/colleges/${encodeURIComponent(college.slug)}${query}`;
        return <CollegeCard key={college.id} college={college} href={href} />;
      })}
    </div>
  );
}

function CollegeCard({ college, href }: { college: CollegePublicLite; href: string }) {
  return (
    <Link href={href} prefetch={false} className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <Card className="relative h-full overflow-hidden border bg-card/95 shadow-sm group-hover:border-primary/40 group-hover:shadow-md">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" aria-hidden />
        <CardContent className="flex h-full items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-bold leading-snug group-hover:text-primary sm:text-xl">{college.name}</CardTitle>
            {college.code ? <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{college.code}</p> : null}
          </div>
          <ArrowLeft className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}

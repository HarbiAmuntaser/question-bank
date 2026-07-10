import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DegreeTypeValue } from "@/lib/degree-types";

type DegreeGroup = {
  value: DegreeTypeValue;
  label: string;
  count: number;
};

interface UniversityDegreeSelectorProps {
  universityName: string;
  basePath: string;
  groups: DegreeGroup[];
}

export function UniversityDegreeSelector({ universityName, basePath, groups }: UniversityDegreeSelectorProps) {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Card className="overflow-hidden border bg-card/95 shadow-sm dark:bg-gray-900/80">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="h-7 w-7" aria-hidden />
              </div>
              <Badge variant="secondary" className="mb-3 rounded-full px-3 py-1">
                {universityName}
              </Badge>
              <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                اختر نوع الدرجة
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                اختر المسار الدراسي الذي تريد استعراض تخصصاته داخل الجامعة.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Link
                  key={group.value}
                  href={`${basePath}?degree=${group.value}`}
                  prefetch={false}
                  className="group rounded-xl border bg-background p-5 text-start shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                        {group.label}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {group.count} تخصص متاح
                      </div>
                    </div>
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Building2 } from "lucide-react";

import type { CollegeMajorGroup } from "@/lib/public/college-major-groups";

function collegeHref(basePath: string, collegeSlug: string, degree?: string | null) {
  const params = new URLSearchParams();
  if (degree) params.set("degree", degree);
  params.set("college", collegeSlug);
  return `${basePath}?${params.toString()}#majors-section`;
}

export function UniversityCollegeSelector({
  basePath,
  degree,
  groups,
  selectedKey,
}: {
  basePath: string;
  degree?: string | null;
  groups: CollegeMajorGroup[];
  selectedKey: string;
}) {
  return (
    <nav aria-label="الكليات" className="mb-7 border-b border-border/70 pb-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Building2 className="h-4 w-4 text-primary" aria-hidden />
        <span>الكليات</span>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
          {groups.map((group) => {
            const selected = group.key === selectedKey;
            return (
              <Link
                key={group.key}
                href={collegeHref(basePath, group.key, degree)}
                prefetch={false}
                aria-current={selected ? "page" : undefined}
                className={
                  selected
                    ? "inline-flex min-h-11 items-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    : "inline-flex min-h-11 items-center rounded-md border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                }
              >
                {group.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

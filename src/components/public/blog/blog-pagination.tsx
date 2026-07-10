import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { CountryCode } from "@/config/regions";
import { cn } from "@/lib/utils";

function pageHref(cc: CountryCode, page: number, basePath?: string) {
  const path = basePath ?? `/${cc}/blog`;
  return page <= 1 ? path : `${path}?page=${page}`;
}

export function PublicBlogPagination({
  cc,
  page,
  totalPages,
  basePath,
}: {
  cc: CountryCode;
  page: number;
  totalPages: number;
  basePath?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" aria-label="صفحات المدونة">
      <p className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={pageHref(cc, page - 1, basePath)} className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}>
            <ChevronRight className="h-4 w-4" aria-hidden />
            السابق
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={pageHref(cc, page + 1, basePath)} className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2")}>
            التالي
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

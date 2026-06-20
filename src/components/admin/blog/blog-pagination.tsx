"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { BlogAdminPaginationKind } from "./types";

function pageParamName(kind: BlogAdminPaginationKind) {
  return `${kind}Page`;
}

function buildHref(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function BlogPagination({
  kind,
  currentPage,
  totalPages,
  totalItems,
}: {
  kind: BlogAdminPaginationKind;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const pageParam = pageParamName(kind);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(pageParam);
    else params.set(pageParam, String(page));
    router.push(buildHref(pathname, params), { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        صفحة <span className="font-medium text-foreground">{currentPage}</span> من{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
        <span className="mx-2 text-border">|</span>
        الإجمالي <span className="font-medium text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 min-w-24 gap-1"
          onClick={() => goToPage(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
          السابق
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 min-w-24 gap-1"
          onClick={() => goToPage(currentPage + 1)}
          disabled={!canGoNext}
        >
          التالي
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

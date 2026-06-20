"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BlogTaxonomyKind } from "./types";

const statusLabels = {
  all: "كل الحالات",
  active: "النشطة",
  inactive: "المعطلة",
} as const;

type StatusValue = keyof typeof statusLabels;

function paramName(kind: BlogTaxonomyKind, suffix: "Query" | "Status" | "Page") {
  return `${kind}${suffix}`;
}

export function BlogTaxonomyFilters({
  kind,
  placeholder,
}: {
  kind: BlogTaxonomyKind;
  placeholder: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryParam = paramName(kind, "Query");
  const statusParam = paramName(kind, "Status");
  const pageParam = paramName(kind, "Page");
  const [query, setQuery] = useState(searchParams.get(queryParam) ?? "");
  const status = (searchParams.get(statusParam) ?? "all") as StatusValue;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();

      if (trimmed) params.set(queryParam, trimmed);
      else params.delete(queryParam);

      params.delete(pageParam);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pageParam, pathname, query, queryParam, router, searchParams]);

  const handleStatusChange = (value: StatusValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(statusParam);
    else params.set(statusParam, value);
    params.delete(pageParam);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full sm:max-w-sm"
      />
      <Select value={status in statusLabels ? status : "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-10 w-full sm:w-[180px]" aria-label="فلترة حسب الحالة">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

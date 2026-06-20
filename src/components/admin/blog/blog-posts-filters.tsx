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

const statusLabels = {
  all: "كل الحالات",
  draft: "مسودة",
  published: "منشور",
  archived: "مؤرشف",
} as const;

type StatusValue = keyof typeof statusLabels;

export function BlogPostsFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("postQuery") ?? "");
  const status = (searchParams.get("postStatus") ?? "all") as StatusValue;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();

      if (trimmed) params.set("postQuery", trimmed);
      else params.delete("postQuery");

      params.delete("postPage");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pathname, query, router, searchParams]);

  const handleStatusChange = (value: string) => {
    const next = value in statusLabels ? (value as StatusValue) : "all";
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("postStatus");
    else params.set("postStatus", next);
    params.delete("postPage");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث بعنوان المقال أو slug..."
        className="h-10 w-full sm:max-w-sm"
      />
      <Select value={status in statusLabels ? status : "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-10 w-full sm:w-[180px]" aria-label="فلترة حسب حالة المقال">
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

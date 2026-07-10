"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
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

const sortLabels = {
  updatedAt: "آخر تحديث",
  createdAt: "تاريخ الإنشاء",
  publishedAt: "تاريخ النشر",
  title: "العنوان",
  sortOrder: "ترتيب العرض",
} as const;

type StatusValue = keyof typeof statusLabels;
type SortValue = keyof typeof sortLabels;

function isStatus(value: string): value is StatusValue {
  return value in statusLabels;
}

function isSort(value: string): value is SortValue {
  return value in sortLabels;
}

function pushParams(router: ReturnType<typeof useRouter>, pathname: string, params: URLSearchParams) {
  const query = params.toString();
  router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
}

export function SummariesFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const statusParam = searchParams.get("status") ?? "all";
  const status = isStatus(statusParam) ? statusParam : "all";
  const sortParam = searchParams.get("sortBy") ?? "updatedAt";
  const sortBy = isSort(sortParam) ? sortParam : "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const universityId = searchParams.get("universityId") ?? "";
  const majorId = searchParams.get("majorId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const chapterId = searchParams.get("chapterId") ?? "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();

      if (trimmed) params.set("query", trimmed);
      else params.delete("query");

      params.delete("page");
      pushParams(router, pathname, params);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pathname, query, router, searchParams]);

  const updateFilter = (key: string, value: string, clearKeys: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    clearKeys.forEach((item) => params.delete(item));
    params.delete("page");
    pushParams(router, pathname, params);
  };

  const handleStatusChange = (value: string) => {
    const next = isStatus(value) ? value : "all";
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    params.delete("page");
    pushParams(router, pathname, params);
  };

  const handleSortByChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", isSort(value) ? value : "updatedAt");
    params.delete("page");
    pushParams(router, pathname, params);
  };

  const handleSortOrderChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortOrder", value === "asc" ? "asc" : "desc");
    params.delete("page");
    pushParams(router, pathname, params);
  };

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بعنوان الملخص أو slug..."
          className="h-10 w-full lg:max-w-sm"
        />
        <div className="grid gap-2 sm:grid-cols-3 lg:w-auto">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-10 w-full lg:w-[180px]" aria-label="فلترة حسب حالة الملخص">
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

          <Select value={sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger className="h-10 w-full lg:w-[180px]" aria-label="ترتيب الملخصات حسب">
              <SelectValue placeholder="الترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={handleSortOrderChange}>
            <SelectTrigger className="h-10 w-full lg:w-[140px]" aria-label="اتجاه الترتيب">
              <SelectValue placeholder="الاتجاه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">تنازلي</SelectItem>
              <SelectItem value="asc">تصاعدي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AdminLookupCombobox
          type="university"
          value={universityId}
          onValueChange={(next) => updateFilter("universityId", next, ["majorId", "subjectId", "chapterId"])}
          placeholder="الجامعة"
        />
        <AdminLookupCombobox
          type="major"
          value={majorId}
          onValueChange={(next) => updateFilter("majorId", next, ["subjectId", "chapterId"])}
          universityId={universityId}
          disabled={!universityId && !majorId}
          placeholder={universityId ? "التخصص" : "اختر الجامعة أولًا"}
        />
        <AdminLookupCombobox
          type="subject"
          value={subjectId}
          onValueChange={(next) => updateFilter("subjectId", next, ["chapterId"])}
          majorId={majorId}
          disabled={!majorId && !subjectId}
          placeholder={majorId ? "المادة" : "اختر التخصص أولًا"}
        />
        <AdminLookupCombobox
          type="chapter"
          value={chapterId}
          onValueChange={(next) => updateFilter("chapterId", next)}
          subjectId={subjectId}
          disabled={!subjectId && !chapterId}
          placeholder={subjectId ? "الفصل" : "اختر المادة أولًا"}
        />
      </div>
    </div>
  );
}

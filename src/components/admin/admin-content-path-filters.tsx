"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import type { AdminLookupOption } from "@/app/admin/lookups/actions";

type FilterDepth = "college" | "major" | "subject" | "chapter";
type InstitutionType = "university" | "school" | "academy";

const descendants = {
  universityId: ["collegeId", "majorId", "subjectId", "chapterId"],
  collegeId: ["majorId", "subjectId", "chapterId"],
  majorId: ["subjectId", "chapterId"],
  subjectId: ["chapterId"],
  chapterId: [],
} as const;

export function AdminContentPathFilters({ through }: { through: FilterDepth }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [institutionType, setInstitutionType] = useState<InstitutionType | null>(null);

  const universityId = searchParams.get("universityId") ?? "";
  const collegeId = searchParams.get("collegeId") ?? "";
  const majorId = searchParams.get("majorId") ?? "";
  const subjectId = searchParams.get("subjectId") ?? "";
  const chapterId = searchParams.get("chapterId") ?? "";
  const includesMajor = through !== "college";
  const includesSubject = through === "subject" || through === "chapter";
  const includesChapter = through === "chapter";
  const showCollege = institutionType === "university";

  const updateFilter = useCallback(
    (key: keyof typeof descendants, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      descendants[key].forEach((item) => params.delete(item));
      params.delete("page");
      const query = params.toString();
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const handleUniversityOption = useCallback((option: AdminLookupOption | null) => {
    setInstitutionType(option?.institutionType ?? null);
  }, []);

  useEffect(() => {
    if (institutionType && institutionType !== "university" && collegeId) {
      updateFilter("collegeId", "");
    }
  }, [collegeId, institutionType, updateFilter]);

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-5"
      aria-busy={isPending}
      data-admin-content-path-filters
    >
      <AdminLookupCombobox
        type="university"
        value={universityId}
        onValueChange={(value) => updateFilter("universityId", value)}
        onOptionChange={handleUniversityOption}
        placeholder="كل الجهات التعليمية"
      />

      {showCollege ? (
        <AdminLookupCombobox
          type="college"
          value={collegeId}
          onValueChange={(value) => updateFilter("collegeId", value)}
          universityId={universityId}
          disabled={!universityId}
          placeholder="كل الكليات"
        />
      ) : null}

      {includesMajor ? (
        <AdminLookupCombobox
          type="major"
          value={majorId}
          onValueChange={(value) => updateFilter("majorId", value)}
          universityId={universityId}
          collegeId={showCollege ? collegeId : undefined}
          disabled={!universityId}
          placeholder={universityId ? "كل التخصصات" : "اختر الجهة أولًا"}
        />
      ) : null}

      {includesSubject ? (
        <AdminLookupCombobox
          type="subject"
          value={subjectId}
          onValueChange={(value) => updateFilter("subjectId", value)}
          majorId={majorId}
          disabled={!majorId}
          placeholder={majorId ? "كل المقررات" : "اختر التخصص أولًا"}
        />
      ) : null}

      {includesChapter ? (
        <AdminLookupCombobox
          type="chapter"
          value={chapterId}
          onValueChange={(value) => updateFilter("chapterId", value)}
          subjectId={subjectId}
          disabled={!subjectId}
          placeholder={subjectId ? "كل الفصول" : "اختر المقرر أولًا"}
        />
      ) : null}
    </div>
  );
}

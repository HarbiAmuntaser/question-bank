"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function QuizzesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [universityId, setUniversityId] = useState(search.get("universityId") ?? "");
  const [majorId, setMajorId] = useState(search.get("majorId") ?? "");
  const [subjectId, setSubjectId] = useState(search.get("subjectId") ?? "");

  useEffect(() => {
    setUniversityId(search.get("universityId") ?? "");
    setMajorId(search.get("majorId") ?? "");
    setSubjectId(search.get("subjectId") ?? "");
  }, [search]);

  const updateParams = useCallback(
    (next: { universityId?: string; majorId?: string; subjectId?: string }) => {
      const params = new URLSearchParams(search.toString());
      const nextUniversityId = next.universityId ?? universityId;
      const nextMajorId = next.majorId ?? majorId;
      const nextSubjectId = next.subjectId ?? subjectId;

      if (nextUniversityId) params.set("universityId", nextUniversityId);
      else params.delete("universityId");

      if (nextMajorId) params.set("majorId", nextMajorId);
      else params.delete("majorId");

      if (nextSubjectId) params.set("subjectId", nextSubjectId);
      else params.delete("subjectId");

      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [majorId, pathname, router, search, subjectId, universityId],
  );

  const handleUniversityChange = (value: string) => {
    setUniversityId(value);
    setMajorId("");
    setSubjectId("");
    updateParams({ universityId: value, majorId: "", subjectId: "" });
  };

  const handleMajorChange = (value: string) => {
    setMajorId(value);
    setSubjectId("");
    updateParams({ majorId: value, subjectId: "" });
  };

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    updateParams({ subjectId: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>الجامعة</Label>
          <AdminLookupCombobox
            type="university"
            value={universityId}
            onValueChange={handleUniversityChange}
            placeholder="ابحث عن جامعة"
          />
        </div>

        <div className="space-y-2">
          <Label>التخصص</Label>
          <AdminLookupCombobox
            type="major"
            value={majorId}
            onValueChange={handleMajorChange}
            universityId={universityId}
            disabled={!universityId && !majorId}
            placeholder={universityId ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
          />
        </div>

        <div className="space-y-2">
          <Label>المقرر</Label>
          <AdminLookupCombobox
            type="subject"
            value={subjectId}
            onValueChange={handleSubjectChange}
            majorId={majorId}
            disabled={!majorId && !subjectId}
            placeholder={majorId ? "ابحث عن مقرر" : "اختر التخصص أولاً"}
          />
        </div>
      </div>
      <Separator />
    </div>
  );
}

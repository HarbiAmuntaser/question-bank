"use client";

import { useState } from "react";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Label } from "@/components/ui/label";

type ImportPathFieldsProps = {
  universityId: string;
  collegeId: string;
  majorId: string;
  subjectId: string;
  chapterId: string;
  reviewSummaryId: string;
  isImporting: boolean;
  onUniversityChange: (value: string) => void;
  onCollegeChange: (value: string) => void;
  onMajorChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onChapterChange: (value: string) => void;
  onReviewSummaryChange: (value: string) => void;
};

export function ImportPathFields({
  universityId,
  collegeId,
  majorId,
  subjectId,
  chapterId,
  reviewSummaryId,
  isImporting,
  onUniversityChange,
  onCollegeChange,
  onMajorChange,
  onSubjectChange,
  onChapterChange,
  onReviewSummaryChange,
}: ImportPathFieldsProps) {
  const [institutionType, setInstitutionType] = useState<"university" | "school" | "academy" | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>الجامعة</Label>
        <AdminLookupCombobox
          type="university"
          value={universityId}
          onValueChange={onUniversityChange}
          onOptionChange={(option) => setInstitutionType(option?.institutionType ?? null)}
          placeholder="ابحث عن جامعة"
          disabled={isImporting}
          disablePortal
        />
      </div>

      {institutionType === "university" ? (
        <div className="space-y-2">
          <Label>الكلية</Label>
          <AdminLookupCombobox
            type="college"
            value={collegeId}
            onValueChange={onCollegeChange}
            universityId={universityId}
            disabled={isImporting || !universityId}
            placeholder="اختياري: اختر كلية"
            disablePortal
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>التخصص</Label>
        <AdminLookupCombobox
          type="major"
          value={majorId}
          onValueChange={onMajorChange}
          universityId={universityId}
          collegeId={institutionType === "university" ? collegeId : undefined}
          disabled={isImporting || !universityId}
          placeholder={universityId ? "ابحث عن تخصص" : "اختر الجامعة أولًا"}
          disablePortal
        />
      </div>

      <div className="space-y-2">
        <Label>المقرر</Label>
        <AdminLookupCombobox
          type="subject"
          value={subjectId}
          onValueChange={onSubjectChange}
          majorId={majorId}
          disabled={isImporting || !majorId}
          placeholder={majorId ? "ابحث عن مقرر" : "اختر التخصص أولًا"}
          disablePortal
        />
      </div>

      <div className="space-y-2">
        <Label>الفصل</Label>
        <AdminLookupCombobox
          type="chapter"
          value={chapterId}
          onValueChange={onChapterChange}
          subjectId={subjectId}
          disabled={isImporting || !subjectId}
          placeholder={subjectId ? "ابحث عن فصل" : "اختر المقرر أولًا"}
          disablePortal
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>الملخص المرجعي لهذه الدفعة</Label>
        <AdminLookupCombobox
          type="summary"
          value={reviewSummaryId}
          onValueChange={onReviewSummaryChange}
          chapterId={chapterId}
          disabled={isImporting || !chapterId}
          placeholder={chapterId ? "اختياري: اختر ملخصًا تابعًا لنفس الفصل" : "اختر الفصل أولًا"}
          disablePortal
        />
        <p className="text-xs text-muted-foreground">
          سيُطبّق على جميع الأسئلة الجديدة في الدفعة. لا تضع UUID للملخص داخل JSON.
        </p>
      </div>
    </div>
  );
}

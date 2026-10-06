"use client";

import { useState } from "react";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Label } from "@/components/ui/label";

type UnivOption = { id: string; name: string; code: string | null };
type MajorOption = { id: string; name: string; code: string | null };
type SubjectOption = { id: string; name: string; code: string | null };
type ChapterOption = { id: string; name: string; chapterNumber: number | null };

export function QuestionCascader(props: {
  universities?: UnivOption[];
  majors?: MajorOption[];
  subjects?: SubjectOption[];
  chapters?: ChapterOption[];
  selectedUniversity: string;
  selectedCollege: string;
  selectedMajor: string;
  selectedSubject: string;
  selectedChapter: string;
  onUniversityChange: (id: string) => void;
  onCollegeChange: (id: string) => void;
  onMajorChange: (id: string) => void;
  onSubjectChange: (id: string) => void;
  onChapterChange: (id: string) => void;
}) {
  const {
    selectedUniversity,
    selectedCollege,
    selectedMajor,
    selectedSubject,
    selectedChapter,
    onUniversityChange,
    onCollegeChange,
    onMajorChange,
    onSubjectChange,
    onChapterChange,
  } = props;
  const [institutionType, setInstitutionType] = useState<"university" | "school" | "academy" | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="col-span-1 text-right">الجامعة</Label>
        <div className="col-span-3">
          <AdminLookupCombobox
            type="university"
            value={selectedUniversity}
            onValueChange={onUniversityChange}
            onOptionChange={(option) => setInstitutionType(option?.institutionType ?? null)}
            disablePortal
            placeholder="ابحث عن جامعة"
          />
        </div>
      </div>

      {institutionType === "university" ? (
        <div className="grid grid-cols-4 items-center gap-3">
          <Label className="col-span-1 text-right">الكلية</Label>
          <div className="col-span-3">
            <AdminLookupCombobox
              type="college"
              value={selectedCollege}
              onValueChange={onCollegeChange}
              disablePortal
              universityId={selectedUniversity}
              disabled={!selectedUniversity}
              placeholder="اختياري: اختر كلية"
            />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="col-span-1 text-right">التخصص</Label>
        <div className="col-span-3">
          <AdminLookupCombobox
            type="major"
            value={selectedMajor}
            onValueChange={onMajorChange}
            disablePortal
            universityId={selectedUniversity}
            collegeId={institutionType === "university" ? selectedCollege : undefined}
            disabled={!selectedUniversity}
            placeholder={selectedUniversity ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="col-span-1 text-right">المقرر</Label>
        <div className="col-span-3">
          <AdminLookupCombobox
            type="subject"
            value={selectedSubject}
            onValueChange={onSubjectChange}
            disablePortal
            majorId={selectedMajor}
            disabled={!selectedMajor}
            placeholder={selectedMajor ? "ابحث عن مقرر" : "اختر التخصص أولاً"}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="col-span-1 text-right">الفصل</Label>
        <div className="col-span-3">
          <AdminLookupCombobox
            type="chapter"
            value={selectedChapter}
            onValueChange={onChapterChange}
            disablePortal
            subjectId={selectedSubject}
            disabled={!selectedSubject}
            placeholder={selectedSubject ? "ابحث عن فصل" : "اختر المقرر أولاً"}
          />
        </div>
      </div>
    </div>
  );
}

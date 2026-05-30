"use client";

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
  selectedMajor: string;
  selectedSubject: string;
  selectedChapter: string;
  onUniversityChange: (id: string) => void;
  onMajorChange: (id: string) => void;
  onSubjectChange: (id: string) => void;
  onChapterChange: (id: string) => void;
}) {
  const {
    selectedUniversity,
    selectedMajor,
    selectedSubject,
    selectedChapter,
    onUniversityChange,
    onMajorChange,
    onSubjectChange,
    onChapterChange,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="col-span-1 text-right">الجامعة</Label>
        <div className="col-span-3">
          <AdminLookupCombobox
            type="university"
            value={selectedUniversity}
            onValueChange={onUniversityChange}
            disablePortal
            placeholder="ابحث عن جامعة"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="col-span-1 text-right">التخصص</Label>
        <div className="col-span-3">
          <AdminLookupCombobox
            type="major"
            value={selectedMajor}
            onValueChange={onMajorChange}
            disablePortal
            universityId={selectedUniversity}
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

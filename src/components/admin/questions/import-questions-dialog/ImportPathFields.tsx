import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Label } from "@/components/ui/label";

type ImportPathFieldsProps = {
  universityId: string;
  majorId: string;
  subjectId: string;
  chapterId: string;
  isImporting: boolean;
  onUniversityChange: (value: string) => void;
  onMajorChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onChapterChange: (value: string) => void;
};

export function ImportPathFields({
  universityId,
  majorId,
  subjectId,
  chapterId,
  isImporting,
  onUniversityChange,
  onMajorChange,
  onSubjectChange,
  onChapterChange,
}: ImportPathFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>الجامعة</Label>
        <AdminLookupCombobox
          type="university"
          value={universityId}
          onValueChange={onUniversityChange}
          placeholder="ابحث عن جامعة"
          disabled={isImporting}
          disablePortal
        />
      </div>

      <div className="space-y-2">
        <Label>التخصص</Label>
        <AdminLookupCombobox
          type="major"
          value={majorId}
          onValueChange={onMajorChange}
          universityId={universityId}
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
    </div>
  );
}

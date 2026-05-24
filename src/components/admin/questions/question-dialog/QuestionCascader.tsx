"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UnivOption = { id: string; name: string; code: string | null };
type MajorOption = { id: string; name: string; code: string | null };
type SubjectOption = { id: string; name: string; code: string | null };
type ChapterOption = { id: string; name: string; chapterNumber: number | null };

export function QuestionCascader(props: {
  universities: UnivOption[];
  majors: MajorOption[];
  subjects: SubjectOption[];
  chapters: ChapterOption[];

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
    universities,
    majors,
    subjects,
    chapters,
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
    <div className="grid grid-cols-2 gap-4">
      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="text-right col-span-1">الجامعة</Label>
        <div className="col-span-3">
          <Select value={selectedUniversity} onValueChange={onUniversityChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الجامعة" />
            </SelectTrigger>
            <SelectContent>
              {universities.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                  {u.code ? ` - ${u.code}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="text-right col-span-1">التخصص</Label>
        <div className="col-span-3">
          <Select value={selectedMajor} onValueChange={onMajorChange} disabled={!selectedUniversity}>
            <SelectTrigger>
              <SelectValue placeholder={selectedUniversity ? "اختر التخصص" : "اختر الجامعة أولاً"} />
            </SelectTrigger>
            <SelectContent>
              {majors.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                  {m.code ? ` - ${m.code}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="text-right col-span-1">المقرر</Label>
        <div className="col-span-3">
          <Select value={selectedSubject} onValueChange={onSubjectChange} disabled={!selectedMajor}>
            <SelectTrigger>
              <SelectValue placeholder={selectedMajor ? "اختر المقرر" : "اختر التخصص أولاً"} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.code ? ` - ${s.code}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-3">
        <Label className="text-right col-span-1">الفصل</Label>
        <div className="col-span-3">
          <Select value={selectedChapter} onValueChange={onChapterChange} disabled={!selectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder={selectedSubject ? "اختر الفصل" : "اختر المقرر أولاً"} />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {typeof c.chapterNumber === "number" ? ` (فصل ${c.chapterNumber})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

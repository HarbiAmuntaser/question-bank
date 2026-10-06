"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import {
  searchQuizGeneratorChaptersAction,
  type QuizGeneratorChapter,
} from "@/app/admin/quiz-generator/actions";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type InstitutionType = "university" | "school" | "academy";

export function ChapterCascader({
  selectedChapters,
  onChange,
  onAvailableCountChange,
}: {
  selectedChapters: string[];
  onChange: (ids: string[]) => void;
  onAvailableCountChange: (count: number) => void;
}) {
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [institutionType, setInstitutionType] = useState<InstitutionType | null>(null);
  const [query, setQuery] = useState("");
  const [chapters, setChapters] = useState<QuizGeneratorChapter[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, QuizGeneratorChapter>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchQuizGeneratorChaptersAction({ subjectId, query })
        .then((rows) => {
          if (!cancelled) setChapters(rows);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, subjectId]);

  useEffect(() => {
    setSelectedDetails((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => selectedChapters.includes(id))),
    );
  }, [selectedChapters]);

  const totalSelectedQuestions = useMemo(
    () => selectedChapters.reduce((sum, id) => sum + (selectedDetails[id]?.activeQuestionCount ?? 0), 0),
    [selectedChapters, selectedDetails],
  );

  useEffect(() => {
    onAvailableCountChange(totalSelectedQuestions);
  }, [onAvailableCountChange, totalSelectedQuestions]);

  const toggleChapter = (chapter: QuizGeneratorChapter) => {
    const selected = selectedChapters.includes(chapter.id);
    onChange(selected ? selectedChapters.filter((id) => id !== chapter.id) : [...selectedChapters, chapter.id]);
    setSelectedDetails((current) => {
      if (!selected) return { ...current, [chapter.id]: chapter };
      const next = { ...current };
      delete next[chapter.id];
      return next;
    });
  };

  const handleUniversityChange = (value: string) => {
    setUniversityId(value);
    setCollegeId("");
    setMajorId("");
    setSubjectId("");
    setQuery("");
    setChapters([]);
  };

  const handleCollegeChange = (value: string) => {
    setCollegeId(value);
    setMajorId("");
    setSubjectId("");
    setQuery("");
    setChapters([]);
  };

  const handleMajorChange = (value: string) => {
    setMajorId(value);
    setSubjectId("");
    setQuery("");
    setChapters([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>اختيار الفصول</CardTitle>
        <CardDescription>
          تُحمّل الفصول بعد اختيار المقرر فقط. يمكنك الاحتفاظ بفصول من أكثر من مقرر لاختبار تجميعي.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>الجهة التعليمية</Label>
            <AdminLookupCombobox
              type="university"
              value={universityId}
              onValueChange={handleUniversityChange}
              onOptionChange={(option) => setInstitutionType(option?.institutionType ?? null)}
              placeholder="ابحث عن جامعة أو أكاديمية"
            />
          </div>

          {institutionType === "university" ? (
            <div className="space-y-2">
              <Label>الكلية</Label>
              <AdminLookupCombobox
                type="college"
                value={collegeId}
                onValueChange={handleCollegeChange}
                universityId={universityId}
                disabled={!universityId}
                placeholder="اختياري: اختر كلية"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AdminLookupCombobox
              type="major"
              value={majorId}
              onValueChange={handleMajorChange}
              universityId={universityId}
              collegeId={institutionType === "university" ? collegeId : undefined}
              disabled={!universityId}
              placeholder={universityId ? "ابحث عن تخصص" : "اختر الجهة أولًا"}
            />
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <AdminLookupCombobox
              type="subject"
              value={subjectId}
              onValueChange={(value) => {
                setSubjectId(value);
                setQuery("");
                setChapters([]);
              }}
              majorId={majorId}
              disabled={!majorId}
              placeholder={majorId ? "ابحث عن مقرر" : "اختر التخصص أولًا"}
            />
          </div>
        </div>

        {selectedChapters.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>الفصول المختارة ({selectedChapters.length})</Label>
              <span className="text-sm text-muted-foreground">
                {totalSelectedQuestions} سؤال نشط متاح
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedChapters.map((id) => {
                const chapter = selectedDetails[id];
                return (
                  <Badge key={id} variant="secondary" className="gap-2 py-1.5">
                    {chapter?.name ?? "فصل مختار"}
                    <button
                      type="button"
                      aria-label="إزالة الفصل"
                      onClick={() => chapter && toggleChapter(chapter)}
                      className="rounded-sm px-1 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Separator />
          </div>
        ) : null}

        {subjectId ? (
          <div className="space-y-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث داخل فصول المقرر"
                className="pe-9"
              />
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-3">
              {loading ? (
                <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جار تحميل الفصول...
                </div>
              ) : chapters.length ? (
                chapters.map((chapter) => (
                  <label
                    key={chapter.id}
                    htmlFor={"generator-chapter-" + chapter.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={"generator-chapter-" + chapter.id}
                      checked={selectedChapters.includes(chapter.id)}
                      onCheckedChange={() => toggleChapter(chapter)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{chapter.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {chapter.activeQuestionCount} سؤال نشط
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
                  لا توجد فصول مطابقة.
                </div>
              )}
            </div>

            {chapters.length === 50 ? (
              <p className="text-xs text-muted-foreground">
                تظهر أول 50 نتيجة فقط. استخدم البحث للوصول إلى فصل آخر.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            اختر الجهة والتخصص والمقرر لعرض الفصول.
          </div>
        )}

        {selectedChapters.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
            مسح كل الفصول المختارة
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

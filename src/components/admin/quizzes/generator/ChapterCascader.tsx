// src/components/admin/quizzes/generator/ChapterCascader.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { ChapterWithRelations } from "@/types";
import { getChaptersAction } from "@/app/admin/questions/actions";

export function ChapterCascader({
  selectedChapters,
  onChange,
}: {
  selectedChapters: string[];
  onChange: (ids: string[]) => void;
}) {
  const [allChapters, setAllChapters] = useState<ChapterWithRelations[]>([]);
  const [universityId, setUniversityId] = useState<string>("");
  const [majorId, setMajorId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const data = await getChaptersAction(); // { data, pagination }
      // لو كانت الدالة ترجع {data: [...]} استخرجها
      const list = Array.isArray((data as any)?.data) ? (data as any).data : (data as any) || [];
      setAllChapters(list as ChapterWithRelations[]);
    })();
  }, []);

  const universities = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const ch of allChapters) {
      const u = ch.subject.major.university;
      map.set(u.id, { id: u.id, name: u.name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [allChapters]);

  const majors = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const ch of allChapters) {
      const u = ch.subject.major.university;
      if (!universityId || u.id === universityId) {
        const m = ch.subject.major;
        map.set(m.id, { id: m.id, name: m.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [allChapters, universityId]);

  const subjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const ch of allChapters) {
      const m = ch.subject.major;
      const u = ch.subject.major.university;
      if ((!universityId || u.id === universityId) && (!majorId || m.id === majorId)) {
        const s = ch.subject;
        map.set(s.id, { id: s.id, name: s.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [allChapters, universityId, majorId]);

  const filteredChapters = useMemo(() => {
    return allChapters
      .filter((c) => {
        const u = c.subject.major.university.id;
        const m = c.subject.major.id;
        const s = c.subject.id;
        return (!universityId || u === universityId) && (!majorId || m === majorId) && (!subjectId || s === subjectId);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [allChapters, universityId, majorId, subjectId]);

  const toggleChapter = (id: string) => {
    const next = new Set<string>(selectedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  useEffect(() => {
    setMajorId("");
    setSubjectId("");
  }, [universityId]);

  useEffect(() => {
    setSubjectId("");
  }, [majorId]);

  // مجموع الأسئلة للفصول المختارة
  const totalSelectedQuestions = useMemo(
    () =>
      allChapters
        .filter((c) => selectedChapters.includes(c.id))
        .reduce((sum, c: any) => sum + (c.questionsCount ?? c._count?.questions ?? 0), 0),
    [allChapters, selectedChapters]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>اختيار الفصول</CardTitle>
        <CardDescription>اختر الجامعة ثم التخصص ثم المقرر لتظهر لك الفصول</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>الجامعة</Label>
            <Select value={universityId} onValueChange={setUniversityId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الجامعة" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <Select value={majorId} onValueChange={setMajorId} disabled={!universityId}>
              <SelectTrigger>
                <SelectValue placeholder={universityId ? "اختر التخصص" : "اختر الجامعة أولاً"} />
              </SelectTrigger>
              <SelectContent>
                {majors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!majorId}>
              <SelectTrigger>
                <SelectValue placeholder={majorId ? "اختر المقرر" : "اختر التخصص أولاً"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* المختار */}
        {selectedChapters.length > 0 && (
          <div className="space-y-2">
            <Label>الفصول المختارة ({selectedChapters.length})</Label>
            <div className="flex flex-wrap gap-2">
              {selectedChapters.map((id) => {
                const c: any = allChapters.find((x) => x.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {c?.name ?? id}
                    <button
                      type="button"
                      onClick={() => toggleChapter(id)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                    >
                      ×
                    </button>
                  </Badge>
                );
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              عدد الأسئلة المتاحة من الفصول المختارة:{" "}
              <span className="font-semibold arabic-numbers">{totalSelectedQuestions}</span>
            </div>
            <Separator />
          </div>
        )}

        {/* قائمة الفصول */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredChapters.map((c: any) => (
            <div key={c.id} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={c.id}
                checked={selectedChapters.includes(c.id)}
                onCheckedChange={() => toggleChapter(c.id)}
              />
              <Label htmlFor={c.id} className="text-sm flex-1">
                {c.name}
               <span className="text-muted-foreground mr-2">
  ({(c as any).questionsCount ?? c._count?.questions ?? 0} سؤال)
</span>

              </Label>
            </div>
          ))}
          {universityId && majorId && subjectId && filteredChapters.length === 0 && (
            <div className="text-sm text-muted-foreground">لا توجد فصول مطابقة.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type Uni = { id: string; name: string };
type Major = { id: string; name: string; universityId: string };
type Subject = { id: string; name: string; majorId: string };

async function fetchJSON<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data ?? []) as T[];
}

export function QuizzesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [universities, setUniversities] = useState<Uni[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [universityId, setUniversityId] = useState<string>(search.get("universityId") ?? "");
  const [majorId, setMajorId] = useState<string>(search.get("majorId") ?? "");
  const [subjectId, setSubjectId] = useState<string>(search.get("subjectId") ?? "");

  useEffect(() => {
    (async () => {
      const [unis, mjs, subs] = await Promise.all([
        fetchJSON<Uni>("/api/v1/admin/universities?page=1&pageSize=1000&sortBy=name&sortOrder=asc"),
        fetchJSON<Major>("/api/v1/admin/majors?page=1&pageSize=2000&sortBy=name&sortOrder=asc"),
        fetchJSON<Subject>("/api/v1/admin/subjects?page=1&pageSize=4000&sortBy=name&sortOrder=asc"),
      ]);
      setUniversities(unis);
      setMajors(mjs);
      setSubjects(subs);
    })();
  }, []);

  // اشتقاقات حسب الاختيار
  const filteredMajors = useMemo(
    () => majors.filter((m) => !universityId || m.universityId === universityId),
    [majors, universityId]
  );
  const filteredSubjects = useMemo(
    () => subjects.filter((s) => !majorId || s.majorId === majorId),
    [subjects, majorId]
  );

  // ريست عند تغيير الأعلى
  useEffect(() => {
    setMajorId("");
    setSubjectId("");
  }, [universityId]);
  useEffect(() => {
    setSubjectId("");
  }, [majorId]);

  // ادفع البارامترات إلى العنوان
  useEffect(() => {
    const params = new URLSearchParams(search.toString());
    if (universityId) params.set("universityId", universityId); else params.delete("universityId");
    if (majorId) params.set("majorId", majorId); else params.delete("majorId");
    if (subjectId) params.set("subjectId", subjectId); else params.delete("subjectId");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universityId, majorId, subjectId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>الجامعة</Label>
          <Select value={universityId} onValueChange={setUniversityId}>
            <SelectTrigger><SelectValue placeholder="اختر الجامعة" /></SelectTrigger>
            <SelectContent>
              {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>التخصص</Label>
          <Select value={majorId} onValueChange={setMajorId} disabled={!universityId}>
            <SelectTrigger><SelectValue placeholder={universityId ? "اختر التخصص" : "اختر الجامعة أولاً"} /></SelectTrigger>
            <SelectContent>
              {filteredMajors.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>المقرر</Label>
          <Select value={subjectId} onValueChange={setSubjectId} disabled={!majorId}>
            <SelectTrigger><SelectValue placeholder={majorId ? "اختر المقرر" : "اختر التخصص أولاً"} /></SelectTrigger>
            <SelectContent>
              {filteredSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
    </div>
  );
}

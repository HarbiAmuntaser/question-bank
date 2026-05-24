// src/components/admin/questions/QuestionsFilters.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Opt = { id: string; name: string; code?: string | null };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) throw new Error(await res.text().catch(() => "fetch_error"));
  return (await res.json()) as T;
}

export function QuestionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const universityId = sp.get("universityId") ?? "__all__";
  const majorId = sp.get("majorId") ?? "__all__";
  const subjectId = sp.get("subjectId") ?? "__all__";
  const chapterId = sp.get("chapterId") ?? "__all__";

  // الخيارات
  const [universities, setUniversities] = useState<Opt[]>([]);
  const [majors, setMajors] = useState<Opt[]>([]);
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [chapters, setChapters] = useState<Opt[]>([]);

  // تحميل الجامعات عند الفتح
  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ page: "1", pageSize: "1000", sortBy: "name", sortOrder: "asc" });
        const payload = await fetchJson<{ data: Opt[] }>(`/api/v1/admin/universities?${qs.toString()}`);
        setUniversities(payload.data);
      } catch {
        setUniversities([]);
      }
    })();
  }, []);

  // عند تغيير الجامعة: حمل التخصصات
  useEffect(() => {
    if (universityId && universityId !== "__all__") {
      (async () => {
        try {
          const qs = new URLSearchParams({
            page: "1",
            pageSize: "1000",
            sortBy: "name",
            sortOrder: "asc",
            universityId,
          });
          const payload = await fetchJson<{ data: Opt[] }>(`/api/v1/admin/majors?${qs.toString()}`);
          setMajors(payload.data);
        } catch {
          setMajors([]);
        }
      })();
    } else {
      setMajors([]);
    }
    // reset الأدنى
    setSubjects([]);
    setChapters([]);
  }, [universityId]);

  // عند تغيير التخصص: حمل المقررات
  useEffect(() => {
    if (majorId && majorId !== "__all__") {
      (async () => {
        try {
          const qs = new URLSearchParams({
            page: "1",
            pageSize: "1000",
            sortBy: "createdAt",
            sortOrder: "desc",
            majorId,
          });
          const payload = await fetchJson<{ data: Opt[] }>(`/api/v1/admin/subjects?${qs.toString()}`);
          setSubjects(payload.data);
        } catch {
          setSubjects([]);
        }
      })();
    } else {
      setSubjects([]);
    }
    setChapters([]);
  }, [majorId]);

  // عند تغيير المقرر: حمل الفصول
  useEffect(() => {
    if (subjectId && subjectId !== "__all__") {
      (async () => {
        try {
          const qs = new URLSearchParams({
            page: "1",
            pageSize: "1000",
            sortBy: "createdAt",
            sortOrder: "desc",
            subjectId,
          });
          const payload = await fetchJson<{ data: Opt[] }>(`/api/v1/admin/chapters?${qs.toString()}`);
          // API الفصول يعيد كائنات كاملة؛ نختزلها إلى {id,name}
          const rows = (payload.data as any[]).map((c) => ({ id: c.id, name: c.name })) as Opt[];
          setChapters(rows);
        } catch {
          setChapters([]);
        }
      })();
    } else {
      setChapters([]);
    }
  }, [subjectId]);

  const pushParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null) params.delete(k);
      else params.set(k, v);
    });
    // إعادة الصفحة للأولى عند تغيير أي فلتر
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const onUniversityChange = (val: string) => {
    pushParams({
      universityId: val === "__all__" ? null : val,
      majorId: null,
      subjectId: null,
      chapterId: null,
    });
  };
  const onMajorChange = (val: string) => {
    pushParams({
      majorId: val === "__all__" ? null : val,
      subjectId: null,
      chapterId: null,
    });
  };
  const onSubjectChange = (val: string) => {
    pushParams({
      subjectId: val === "__all__" ? null : val,
      chapterId: null,
    });
  };
  const onChapterChange = (val: string) => {
    pushParams({ chapterId: val === "__all__" ? null : val });
  };

  const disabledMajors = universityId === "__all__";
  const disabledSubjects = disabledMajors || majorId === "__all__";
  const disabledChapters = disabledSubjects || subjectId === "__all__";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* جامعة */}
      <Select value={universityId} onValueChange={onUniversityChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="اختر الجامعة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">كل الجامعات</SelectItem>
          {universities.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* تخصص */}
      <Select value={majorId} onValueChange={onMajorChange} disabled={disabledMajors}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="اختر التخصص" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">كل التخصصات</SelectItem>
          {majors.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* مقرر */}
      <Select value={subjectId} onValueChange={onSubjectChange} disabled={disabledSubjects}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="اختر المقرر" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">كل المقررات</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* فصل */}
      <Select value={chapterId} onValueChange={onChapterChange} disabled={disabledChapters}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="اختر الفصل" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">كل الفصول</SelectItem>
          {chapters.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

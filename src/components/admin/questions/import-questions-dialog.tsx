"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// نفس نمط الفلاتر المتسلسلة المستخدمة سابقًا
type Uni = { id: string; name: string; code: string | null };
type Major = { id: string; name: string; code: string | null };
type Subject = { id: string; name: string; code: string | null };
type Chapter = { id: string; name: string; chapterNumber: number | null };

interface Props {
  children?: React.ReactNode;
}

export function ImportQuestionsDialog({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [universities, setUniversities] = useState<Uni[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [universityId, setUniversityId] = useState<string>("");
  const [majorId, setMajorId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");

  const [rawText, setRawText] = useState<string>("");

  // تحميل الجامعات
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/universities?page=1&pageSize=1000&sortBy=name&sortOrder=asc", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUniversities(data.data ?? []);
      } catch {
        setUniversities([]);
      }
    })();
  }, [open]);

  // عند اختيار جامعة → حمّل التخصصات
  useEffect(() => {
    if (!universityId) { setMajors([]); setMajorId(""); return; }
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/majors?page=1&pageSize=1000&sortBy=name&sortOrder=asc&universityId=${encodeURIComponent(universityId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMajors(data.data ?? []);
      } catch { setMajors([]); }
      setMajorId("");
      setSubjectId("");
      setChapterId("");
      setSubjects([]);
      setChapters([]);
    })();
  }, [universityId]);

  // عند اختيار تخصص → حمّل المقررات
  useEffect(() => {
    if (!majorId) { setSubjects([]); setSubjectId(""); return; }
    (async () => {
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "1000", sortBy: "name", sortOrder: "asc", majorId });
        const res = await fetch(`/api/v1/admin/subjects?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSubjects(data.data ?? []);
      } catch { setSubjects([]); }
      setSubjectId("");
      setChapterId("");
      setChapters([]);
    })();
  }, [majorId]);

  // عند اختيار مقرر → حمّل الفصول
  useEffect(() => {
    if (!subjectId) { setChapters([]); setChapterId(""); return; }
    (async () => {
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "1000", sortBy: "chapterNumber", sortOrder: "asc", subjectId });
        const res = await fetch(`/api/v1/admin/chapters?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setChapters(data.data?.map((c: any) => ({ id: c.id, name: c.name, chapterNumber: c.chapterNumber })) ?? []);
      } catch { setChapters([]); }
      setChapterId("");
    })();
  }, [subjectId]);

  function normalizeToItems(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // حاول JSON array
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr;
      } catch { /* fall-through */ }
    }

    // JSONL: كل سطر كائن
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items: any[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        items.push(obj);
      } catch {
        // لو فشل سطر نرمي خطأ واضح
        throw new Error("صيغة JSONL غير صحيحة. تحقّق من كل سطر.");
      }
    }
    return items;
  }

  const handleImport = () => {
    if (!chapterId) {
      toast({ title: "خطأ", description: "اختر فصلاً أولاً", variant: "destructive" });
      return;
    }
    let items: any[];
    try {
      items = normalizeToItems(rawText);
    } catch (e: any) {
      toast({ title: "خطأ في JSON", description: e?.message || "صيغة غير صالحة", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "لا توجد أسئلة", description: "ألصق JSON أو JSONL يحتوي أسئلة", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/admin/questions/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chapterId, items }),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.message || "فشل الاستيراد";
          throw new Error(typeof msg === "string" ? msg : "فشل الاستيراد");
        }
        toast({ title: "تم", description: `تم استيراد ${data.imported} سؤالاً` });
        setOpen(false);
        setRawText("");
      } catch (err: any) {
        toast({ title: "خطأ", description: err?.message || "فشل الاستيراد", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>استيراد أسئلة (JSON / JSONL)</DialogTitle>
          <DialogDescription>اختر المسار (جامعة ← تخصص ← مقرر ← فصل)، ثم ألصق JSON.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* الجامعة */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">الجامعة</Label>
            <div className="col-span-3">
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger><SelectValue placeholder="اختر الجامعة" /></SelectTrigger>
                <SelectContent>
                  {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* التخصص */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">التخصص</Label>
            <div className="col-span-3">
              <Select value={majorId} onValueChange={setMajorId} disabled={!universityId}>
                <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                <SelectContent>
                  {majors.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* المقرر */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">المقرر</Label>
            <div className="col-span-3">
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!majorId}>
                <SelectTrigger><SelectValue placeholder="اختر المقرر" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* الفصل */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">الفصل</Label>
            <div className="col-span-3">
              <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
                <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                <SelectContent>
                  {chapters.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.chapterNumber ? `الفصل ${c.chapterNumber} – ` : ""}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* منطقة JSON */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">الأسئلة (JSON/JSONL)</Label>
            <Textarea
              className="col-span-3 font-mono text-sm min-h-[240px]"
            placeholder={`مثال JSON Array:
[
  {
    "questionText": "ما ناتج 2+2؟",
    "questionType": "multiple_choice",
    "points": 1,
    "options": [
      {"text":"3","isCorrect":false},
      {"text":"4","isCorrect":true},
      {"text":"5","isCorrect":false}
    ]
  },
  {
    "questionText": "الأرض مسطحة.",
    "questionType": "true_false",
    "tfAnswer": false
  }
]

أو JSONL (سطر/سؤال):
{"questionText":"...","questionType":"multiple_choice","options":[{"text":"A","isCorrect":true},{"text":"B","isCorrect":false}]}
{"questionText":"...","questionType":"true_false","tfAnswer":true}
`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={isPending || !chapterId || !rawText.trim()}>
            {isPending ? "جاري الاستيراد..." : "استيراد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

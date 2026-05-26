// src/components/admin/exams/ExamsList.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { TableSkeleton } from "@/components/ui/table-skeleton";

type University = { id: string; name: string; code: string | null };
type Major = { id: string; name: string; code: string | null; universityId: string };
type Subject = { id: string; name: string; code: string | null; majorId: string };

type ExamPaperRow = {
  id: string;
  subjectId: string;
  year: number;
  term: "first" | "second" | "summer";
  session: "regular" | "makeup" | "special";
  code: string | null;
  source: string | null;
  fileUrl: string | null;
  pagesCount: number | null;
  isPublished: boolean;
  language: "ar" | "en";
  createdAt: string;
  updatedAt: string;
  subject: {
    id: string;
    name: string;
    code: string | null;
    major: {
      id: string;
      name: string;
      university: { id: string; name: string; code: string | null };
    };
  };
};

type ListResponse = {
  data: ExamPaperRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function ExamsList() {
  // فلاتر متسلسلة
  const [universities, setUniversities] = useState<University[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [universityId, setUniversityId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // بيانات الجدول
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExamPaperRow[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [pagination, setPagination] = useState<ListResponse["pagination"] | null>(null);

  // تحميل القوائم المرجعية
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [uRes, mRes, sRes] = await Promise.all([
          fetch(`/api/v1/admin/universities?page=1&pageSize=1000&sortBy=name&sortOrder=asc`, { cache: "no-store" }),
          fetch(`/api/v1/admin/majors?page=1&pageSize=2000&sortBy=name&sortOrder=asc`, { cache: "no-store" }),
          fetch(`/api/v1/admin/subjects?page=1&pageSize=4000&sortBy=name&sortOrder=asc`, { cache: "no-store" }),
        ]);
        const [uJson, mJson, sJson] = await Promise.all([uRes.json(), mRes.json(), sRes.json()]);

        if (!alive) return;
        setUniversities(uJson?.data ?? []);
        setMajors(mJson?.data ?? []);
        setSubjects(sJson?.data ?? []);
      } catch {
        // نتجاهل — الفلاتر ليست حرجة لعرض الجدول
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // فلترة القوائم حسب الاختيار
  const filteredMajors = useMemo(
    () => majors.filter((m) => !universityId || m.universityId === universityId),
    [majors, universityId]
  );

  const filteredSubjects = useMemo(
    () => subjects.filter((s) => !majorId || s.majorId === majorId),
    [subjects, majorId]
  );

  // إعادة ضبط التابع عند تغيير مستوى أعلى
  useEffect(() => {
    setMajorId("");
    setSubjectId("");
    setPage(1);
  }, [universityId]);

  useEffect(() => {
    setSubjectId("");
    setPage(1);
  }, [majorId]);

  // تحميل بيانات الأوراق
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("sortBy", "createdAt");
        params.set("sortOrder", "desc");
        if (subjectId) params.set("subjectId", subjectId);
        else if (majorId) params.set("majorId", majorId);
        else if (universityId) params.set("universityId", universityId);

        const res = await fetch(`/api/v1/admin/exams?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!alive) return;
        if (!res.ok) {
          setError(data?.message ?? "فشل تحميل أوراق الاختبارات");
          setRows([]);
          setPagination(null);
        } else {
          setRows(data?.data ?? []);
          setPagination(data?.pagination ?? null);
        }
      } catch {
        if (!alive) return;
        setError("فشل تحميل أوراق الاختبارات");
        setRows([]);
        setPagination(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, pageSize, universityId, majorId, subjectId]);

  return (
    <div className="space-y-6">
      {/* فلاتر */}
      <Card>
        <CardHeader>
          <CardTitle>فلاتر</CardTitle>
          <CardDescription>فلترة حسب الجامعة ثم التخصص ثم المقرر</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {filteredMajors.map((m) => (
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
                {filteredSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول */}
      {loading ? (
        <TableSkeleton columns={9} rows={5} />
      ) : (
      <AdminTableShell minWidth="min-w-[1120px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المقرر</TableHead>
              <TableHead>الجامعة / التخصص</TableHead>
              <TableHead>السنة</TableHead>
              <TableHead>الفصل/الترم</TableHead>
              <TableHead>الجلسة</TableHead>
              <TableHead>الكود</TableHead>
              <TableHead>الملف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات مطابقة.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium">{e.subject.name}</div>
                    {e.subject.code && (
                      <div className="text-xs text-muted-foreground">{e.subject.code}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{e.subject.major.university.name}</div>
                    <div className="text-xs text-muted-foreground">{e.subject.major.name}</div>
                  </TableCell>
                  <TableCell className="arabic-numbers">{e.year}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {e.term === "first" ? "الأول" : e.term === "second" ? "الثاني" : "الصيفي"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {e.session === "regular" ? "عادي" : e.session === "makeup" ? "بديل" : "خاص"}
                    </Badge>
                  </TableCell>
                  <TableCell className="arabic-numbers">{e.code ?? "-"}</TableCell>
                  <TableCell>
                    {e.fileUrl ? (
                      <a
                        href={e.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        فتح
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.isPublished ? "default" : "secondary"}>
                      {e.isPublished ? "منشور" : "غير منشور"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-2">
                      <Link href={`/admin/exams/${e.id}`}>
                        <Button variant="ghost" size="sm" title="عرض">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {/* أزرار التعديل/الحذف نضيفها في الجزء التالي */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* ترقيم بسيط */}
        {pagination && rows.length > 0 && (
          <div className="flex items-center justify-between p-3">
            <div className="text-sm text-muted-foreground">
              الصفحة <span className="arabic-numbers">{pagination.page}</span> من{" "}
              <span className="arabic-numbers">{pagination.totalPages}</span> — إجمالي{" "}
              <span className="arabic-numbers">{pagination.total}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination || page >= pagination.totalPages}
                onClick={() => setPage((p) => (pagination ? Math.min(pagination.totalPages, p + 1) : p + 1))}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </AdminTableShell>
      )}
    </div>
  );
}

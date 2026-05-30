"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";

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
  const [universityId, setUniversityId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExamPaperRow[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [pagination, setPagination] = useState<ListResponse["pagination"] | null>(null);

  const handleUniversityChange = (value: string) => {
    setUniversityId(value);
    setMajorId("");
    setSubjectId("");
    setPage(1);
  };

  const handleMajorChange = (value: string) => {
    setMajorId(value);
    setSubjectId("");
    setPage(1);
  };

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    setPage(1);
  };

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
        const data = (await res.json().catch(() => ({}))) as Partial<ListResponse> & { message?: string };

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
      <Card>
        <CardHeader>
          <CardTitle>فلاتر</CardTitle>
          <CardDescription>فلترة حسب الجامعة ثم التخصص ثم المقرر</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>الجامعة</Label>
            <AdminLookupCombobox
              type="university"
              value={universityId}
              onValueChange={handleUniversityChange}
              placeholder="ابحث عن جامعة"
            />
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AdminLookupCombobox
              type="major"
              value={majorId}
              onValueChange={handleMajorChange}
              universityId={universityId}
              disabled={!universityId && !majorId}
              placeholder={universityId ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
            />
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <AdminLookupCombobox
              type="subject"
              value={subjectId}
              onValueChange={handleSubjectChange}
              majorId={majorId}
              disabled={!majorId && !subjectId}
              placeholder={majorId ? "ابحث عن مقرر" : "اختر التخصص أولاً"}
            />
          </div>
        </CardContent>
      </Card>

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
                  <TableCell colSpan={9} className="py-8 text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    لا توجد بيانات مطابقة.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div className="font-medium">{exam.subject.name}</div>
                      {exam.subject.code && <div className="text-xs text-muted-foreground">{exam.subject.code}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{exam.subject.major.university.name}</div>
                      <div className="text-xs text-muted-foreground">{exam.subject.major.name}</div>
                    </TableCell>
                    <TableCell className="arabic-numbers">{exam.year}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {exam.term === "first" ? "الأول" : exam.term === "second" ? "الثاني" : "الصيفي"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {exam.session === "regular" ? "عادي" : exam.session === "makeup" ? "بديل" : "خاص"}
                      </Badge>
                    </TableCell>
                    <TableCell className="arabic-numbers" dir="ltr">
                      {exam.code ?? "-"}
                    </TableCell>
                    <TableCell>
                      {exam.fileUrl ? (
                        <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          فتح
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exam.isPublished ? "default" : "secondary"}>
                        {exam.isPublished ? "منشور" : "غير منشور"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <Link href={`/admin/exams/${exam.id}`} aria-label="عرض ورقة الاختبار">
                        <Button variant="ghost" size="sm" title="عرض" aria-label="عرض ورقة الاختبار">
                          <Eye className="h-4 w-4" aria-hidden />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination && rows.length > 0 && (
            <div className="flex items-center justify-between p-3">
              <div className="text-sm text-muted-foreground">
                الصفحة <span className="arabic-numbers">{pagination.page}</span> من{" "}
                <span className="arabic-numbers">{pagination.totalPages}</span> - إجمالي{" "}
                <span className="arabic-numbers">{pagination.total}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
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

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { fetchQuizzesList, deleteQuizAction } from "@/app/admin/quizzes/actions";
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/ui/table-skeleton";

type ListItem = {
  id: string;
  title: string;
  description: string | null;
  totalQuestions: number;
  timeLimit: number;
  isActive: boolean;
  createdAt: string;
  _count: { questions: number; attempts: number };
};

export default function QuizzesTable() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { toast } = useToast();

  const page = Math.max(1, Number(search.get("page") ?? 1) || 1);
  const pageSize = Math.max(1, Number(search.get("pageSize") ?? 10) || 10);
  const sortBy = (search.get("sortBy") as "createdAt" | "title" | "totalQuestions" | "timeLimit") || "createdAt";
  const sortOrder = (search.get("sortOrder") as "asc" | "desc") || "desc";
  const universityId = search.get("universityId") || undefined;
  const majorId = search.get("majorId") || undefined;
  const subjectId = search.get("subjectId") || undefined;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    const r = await fetchQuizzesList({ page, pageSize, sortBy, sortOrder, universityId, majorId, subjectId });
    if (r.success) {
      setRows(r.data ?? []);
      setTotalPages(r.pagination?.totalPages ?? 1);
      setTotal(r.pagination?.total ?? 0);
    } else {
      toast({ title: "حدث خطأ في تحميل الاختبارات", description: r.message || "فشل تحميل الاختبارات", variant: "destructive" });
      setRows([]);
      setTotalPages(1);
      setTotal(0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortOrder, universityId, majorId, subjectId]);

  const setParam = (key: string, value?: string) => {
    const params = new URLSearchParams(search.toString());
    if (value && value.length) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const changePage = (p: number) => {
    const target = Math.max(1, Math.min(totalPages, p));
    const params = new URLSearchParams(search.toString());
    params.set("page", String(target));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الاختبار؟")) return;
    const r = await deleteQuizAction(id);
    if (r.success) {
      toast({ title: "تم الحذف", description: r.message });
      load();
    } else {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex flex-col gap-3 p-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">إجمالي: {total}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "createdAt")}>الأحدث</Button>
          <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "title")}>العنوان</Button>
          <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "totalQuestions")}>عدد الأسئلة</Button>
          <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "timeLimit")}>الوقت</Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={7} rows={5} />
      ) : (
        <div className="overflow-x-auto">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow>
            <TableHead>عنوان الاختبار</TableHead>
            <TableHead>عدد الأسئلة</TableHead>
            <TableHead>الوقت المحدد</TableHead>
            <TableHead>عدد المحاولات</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>تاريخ الإنشاء</TableHead>
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                لا توجد اختبارات مطابقة
              </TableCell>
            </TableRow>
          )}
          {rows.map((quiz) => (
            <TableRow key={quiz.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{quiz.title}</div>
                  {quiz.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">{quiz.description}</div>
                  )}
                </div>
              </TableCell>
              <TableCell><div className="text-sm arabic-numbers">{quiz.totalQuestions}</div></TableCell>
              <TableCell><div className="text-sm arabic-numbers">{quiz.timeLimit} دقيقة</div></TableCell>
              <TableCell><div className="text-sm arabic-numbers">{quiz._count.attempts}</div></TableCell>
              <TableCell>
                <Badge variant={quiz.isActive ? "default" : "secondary"}>{quiz.isActive ? "نشط" : "غير نشط"}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground arabic-numbers">
                  {new Date(quiz.createdAt).toLocaleDateString("ar-SA")}
                </div>
              </TableCell>
              <TableCell className="text-left">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" title="عرض" onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="تعديل" onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="حذف" onClick={() => handleDelete(quiz.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
        </div>
      )}

      {/* ترقيم بسيط */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>السابق</Button>
          <Button variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= totalPages}>التالي</Button>
        </div>
      </div>
    </div>
  );
}

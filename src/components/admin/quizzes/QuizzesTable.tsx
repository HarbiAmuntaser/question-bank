"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, Edit, Trash2 } from "lucide-react";

import { deleteQuizAction, fetchQuizzesList } from "@/app/admin/quizzes/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/hooks/use-toast";

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

type InitialData = {
  rows: ListItem[];
  totalPages: number;
  total: number;
};

export default function QuizzesTable({ initialData }: { initialData?: InitialData }) {
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

  const skipInitialClientLoad = useRef(Boolean(initialData));
  const [loading, setLoading] = useState(initialData === undefined);
  const [rows, setRows] = useState<ListItem[]>(initialData?.rows ?? []);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 1);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetchQuizzesList({ page, pageSize, sortBy, sortOrder, universityId, majorId, subjectId });
    if (r.success) {
      setRows(r.data ?? []);
      setTotalPages(r.pagination?.totalPages ?? 1);
      setTotal(r.pagination?.total ?? 0);
    } else {
      toast({
        title: "حدث خطأ في تحميل الاختبارات",
        description: r.message || "فشل تحميل الاختبارات",
        variant: "destructive",
      });
      setRows([]);
      setTotalPages(1);
      setTotal(0);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (skipInitialClientLoad.current) {
      skipInitialClientLoad.current = false;
      return;
    }
    void load();
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

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    const r = await deleteQuizAction(id);
    if (r.success) {
      toast({ title: "تم الحذف", description: r.message });
      void load();
    } else {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">إجمالي: {total}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "createdAt")}>
              الأحدث
            </Button>
            <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "title")}>
              العنوان
            </Button>
            <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "totalQuestions")}>
              عدد الأسئلة
            </Button>
            <Button variant="outline" size="sm" onClick={() => setParam("sortBy", "timeLimit")}>
              الوقت
            </Button>
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
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
                          <div className="line-clamp-1 text-sm text-muted-foreground">{quiz.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="arabic-numbers text-sm">{quiz.totalQuestions}</div>
                    </TableCell>
                    <TableCell>
                      <div className="arabic-numbers text-sm">{quiz.timeLimit} دقيقة</div>
                    </TableCell>
                    <TableCell>
                      <div className="arabic-numbers text-sm">{quiz._count.attempts}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quiz.isActive ? "default" : "secondary"}>{quiz.isActive ? "نشط" : "غير نشط"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="arabic-numbers text-sm text-muted-foreground">
                        {new Date(quiz.createdAt).toLocaleDateString("ar-SA")}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="عرض"
                          aria-label="عرض الاختبار"
                          onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="تعديل"
                          aria-label="تعديل الاختبار"
                          onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}
                        >
                          <Edit className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="حذف"
                          aria-label="حذف الاختبار"
                          onClick={() => setDeleteId(quiz.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => changePage(page - 1)} disabled={page <= 1}>
              السابق
            </Button>
            <Button variant="outline" size="sm" onClick={() => changePage(page + 1)} disabled={page >= totalPages}>
              التالي
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الاختبار؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الاختبار من لوحة الإدارة. لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

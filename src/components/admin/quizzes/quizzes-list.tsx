// src/components/admin/quizzes/quizzes-list.tsx
import { getQuizzesSimpleAction } from "@/app/admin/quizzes/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export async function QuizzesList() {
  const result = await getQuizzesSimpleAction();

  if (!result.success) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        حدث خطأ في تحميل الاختبارات
        {result.message ? <div className="mt-2 text-xs">{result.message}</div> : null}
      </div>
    );
  }

  const quizzes = result.quizzes || [];

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد اختبارات مُنشأة بعد. قم بإنشاء اختبار جديد من صفحة مولد الاختبارات.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
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
          {quizzes.map((quiz: any) => (
            <TableRow key={quiz.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{quiz.title}</div>
                  {quiz.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">{quiz.description}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm arabic-numbers">{quiz.totalQuestions}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm arabic-numbers">{quiz.timeLimit} دقيقة</div>
              </TableCell>
              <TableCell>
                <div className="text-sm arabic-numbers">{quiz._count?.attempts ?? 0}</div>
              </TableCell>
              <TableCell>
                <Badge variant={quiz.isActive ? "default" : "secondary"}>
                  {quiz.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground arabic-numbers">
                  {new Date(quiz.createdAt).toLocaleDateString("ar-SA")}
                </div>
              </TableCell>
              <TableCell className="text-left">
                <div className="flex gap-2">
                  <Link href={`/admin/quizzes/${quiz.id}`} prefetch={false}>
                    <Button variant="ghost" size="sm" title="عرض">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/admin/quizzes/${quiz.id}/edit`} prefetch={false}>
                    <Button variant="ghost" size="sm" title="تعديل">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" title="حذف" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

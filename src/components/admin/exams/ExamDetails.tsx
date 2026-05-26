"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { deleteExamAction, getExamByIdAction } from "@/app/admin/exams/actions";
import { SeoMetaPanel } from "@/components/admin/seo/SeoMetaPanel";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { ExamAttachmentsManager } from "./ExamAttachmentsManager";
import { ExamPaperDialog } from "./ExamPaperDialog";
import { ExamQuestionsManager } from "./ExamQuestionsManager";

export function ExamDetails({ id }: { id: string }) {
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function load() {
    setLoading(true);
    const r = await getExamByIdAction(id);
    if (!r.success) {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
      setExam(null);
    } else {
      setExam(r.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    setDeleteOpen(false);
    const r = await deleteExamAction(id);
    if (!r.success) {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
      return;
    }
    toast({ title: "نجح", description: r.message });
    router.push("/admin/exams");
  }

  if (loading) {
    return <div className="text-muted-foreground">جاري التحميل...</div>;
  }
  if (!exam) {
    return <div className="text-destructive">تعذر تحميل التفاصيل.</div>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{exam.subject?.name ?? "ورقة اختبار"}</h1>
          <p className="text-sm text-muted-foreground">
            {exam.subject?.major?.university?.name} - {exam.subject?.major?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setOpenEdit(true)}>
            <Pencil className="h-4 w-4" aria-hidden /> تعديل
          </Button>
          <Button variant="destructive" className="gap-2" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> حذف
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات الورقة</CardTitle>
          <CardDescription>تفاصيل أساسية</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">السنة</div>
            <div className="arabic-numbers font-medium">{exam.year}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">الفصل</div>
            <Badge variant="secondary">
              {exam.term === "first" ? "الأول" : exam.term === "second" ? "الثاني" : "الصيفي"}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">الجلسة</div>
            <Badge variant="outline">
              {exam.session === "regular" ? "عادي" : exam.session === "makeup" ? "بديل" : "خاص"}
            </Badge>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">الكود</div>
            <div className="arabic-numbers" dir="ltr">
              {exam.code ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">المصدر</div>
            <div>{exam.source ?? "-"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">الملف</div>
            {exam.fileUrl ? (
              <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                فتح
              </a>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>

          <div>
            <div className="text-sm text-muted-foreground">الصفحات</div>
            <div className="arabic-numbers">{exam.pagesCount ?? "-"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">الحالة</div>
            <Badge variant={exam.isPublished ? "default" : "secondary"}>{exam.isPublished ? "منشور" : "غير منشور"}</Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">اللغة</div>
            <div>{exam.language === "ar" ? "العربية" : "English"}</div>
          </div>
        </CardContent>
      </Card>

      <ExamQuestionsManager examId={id} subjectId={exam.subject?.id} questions={exam.questions ?? []} onChanged={load} />
      <ExamAttachmentsManager examId={id} attachments={exam.attachments ?? []} onChanged={load} />
      <SeoMetaPanel ownerType="exam" ownerId={id} rows={exam.seoMeta ?? []} onChanged={load} />

      <ExamPaperDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        exam={exam}
        onSaved={() => {
          setOpenEdit(false);
          void load();
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ورقة الاختبار؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه الورقة من لوحة الإدارة. لا يمكن التراجع عن هذه العملية.
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

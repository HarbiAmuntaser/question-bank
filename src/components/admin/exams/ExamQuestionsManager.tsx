"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { deleteExamQuestionAction } from "@/app/admin/exams/actions";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RichQuestionContent } from "@/components/shared/rich-question-content";
import { useToast } from "@/hooks/use-toast";

import { ExamQuestionDialog } from "./ExamQuestionDialog";

type ExamQuestionRecord = {
  id: string;
  questionId: string;
  questionNumber: number;
  page: number | null;
  points: number;
  question?: {
    id: string;
    questionText: string;
    difficultyLevel: "easy" | "medium" | "hard";
    points: number;
    chapter?: {
      name?: string | null;
      subject?: { name?: string | null; university?: { name?: string | null } };
    };
  } | null;
};

export function ExamQuestionsManager({
  examId,
  subjectId,
  questions,
  onChanged,
}: {
  examId: string;
  subjectId?: string;
  questions: ExamQuestionRecord[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestionRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamQuestionRecord | null>(null);

  const orderedQuestions = useMemo(() => {
    return [...(questions ?? [])].sort((a, b) => a.questionNumber - b.questionNumber);
  }, [questions]);

  const nextQuestionNumber = useMemo(() => {
    if (!orderedQuestions.length) return 1;
    return Math.max(...orderedQuestions.map((q) => q.questionNumber ?? 0)) + 1;
  }, [orderedQuestions]);

  function openCreateDialog() {
    setEditingQuestion(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: ExamQuestionRecord) {
    setEditingQuestion(row);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(row.id);
    const res = await deleteExamQuestionAction(row.id);
    setDeletingId(null);
    if (!res.success) {
      toast({ title: "خطأ", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحذف", description: res.message });
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>أسئلة الامتحان</CardTitle>
          <CardDescription>إدارة الأسئلة المرتبطة بورقة الامتحان الحالية.</CardDescription>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          إضافة سؤال
        </Button>
      </CardHeader>
      <CardContent>
        {orderedQuestions.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            لا توجد أسئلة مرتبطة بهذه الورقة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">#</TableHead>
                  <TableHead>السؤال</TableHead>
                  <TableHead>الصعوبة</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>الصفحة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedQuestions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="arabic-numbers font-medium">{q.questionNumber}</TableCell>
                    <TableCell>
                      <RichQuestionContent
                        content={q.question?.questionText ?? "سؤال غير متوفر"}
                        className="font-medium leading-5"
                      />
                      <div className="text-xs text-muted-foreground">
                        {q.question?.chapter?.subject?.name}
                        {q.question?.chapter?.name ? ` - ${q.question.chapter.name}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {q.question?.difficultyLevel === "easy"
                          ? "سهل"
                          : q.question?.difficultyLevel === "hard"
                            ? "صعب"
                            : "متوسط"}
                      </Badge>
                    </TableCell>
                    <TableCell className="arabic-numbers">{q.points ?? "-"}</TableCell>
                    <TableCell className="arabic-numbers">{q.page ?? "-"}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" aria-label="تعديل سؤال الامتحان" onClick={() => openEditDialog(q)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === q.id}
                          aria-label="حذف سؤال الامتحان"
                          onClick={() => setDeleteTarget(q)}
                          className="text-destructive hover:text-destructive"
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
      </CardContent>

      <ExamQuestionDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next) setEditingQuestion(null);
          setDialogOpen(next);
        }}
        examId={examId}
        subjectId={subjectId}
        question={editingQuestion ?? undefined}
        defaultOrder={nextQuestionNumber}
        onSaved={() => {
          setDialogOpen(false);
          setEditingQuestion(null);
          onChanged();
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السؤال من الورقة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف ارتباط هذا السؤال بورقة الامتحان. لا يمكن التراجع عن هذه العملية.
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
    </Card>
  );
}

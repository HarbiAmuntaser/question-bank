// src/components/admin/exams/ExamQuestionsManager.tsx
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteExamQuestionAction } from "@/app/admin/exams/actions";
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

  async function handleDelete(row: ExamQuestionRecord) {
    if (!confirm("هل ترغب بحذف هذا السؤال من الورقة؟")) return;
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
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>أسئلة الامتحان</CardTitle>
          <CardDescription>إدارة الأسئلة المرتبطة بورقة الامتحان الحالية.</CardDescription>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة سؤال
        </Button>
      </CardHeader>
      <CardContent>
        {orderedQuestions.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">لا توجد أسئلة مرتبطة بهذه الورقة حتى الآن.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
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
                      <div className="font-medium leading-5">{q.question?.questionText ?? "سؤال غير متوفر"}</div>
                      <div className="text-xs text-muted-foreground">
                        {q.question?.chapter?.subject?.name}
                        {q.question?.chapter?.name ? ` • ${q.question.chapter.name}` : ""}
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
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === q.id}
                          onClick={() => handleDelete(q)}
                          className="text-destructive hover:text-destructive"
                        >
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
    </Card>
  );
}

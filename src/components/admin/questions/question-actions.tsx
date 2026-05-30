// src/components/admin/questions/question-actions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Copy, Download } from "lucide-react";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { QuestionDialog } from "./question-dialog";
import type { QuestionWithRelations } from "@/types";
import { useToast } from "@/hooks/use-toast";

type QuestionActionsProps = {
  // يكفينا id من الجدول، وباقي التفاصيل سنجلبها من API
  question: { id: string };
};

export function QuestionActions({ question }: QuestionActionsProps) {
  const { toast } = useToast();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [editQuestion, setEditQuestion] = useState<QuestionWithRelations | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const handleOpenEdit = async () => {
    setIsLoadingEdit(true);
    try {
      const res = await fetch(`/api/v1/admin/questions/${question.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed_to_load_question");

      const payload: unknown = await res.json().catch(() => ({}));
      const data = (payload as { data?: QuestionWithRelations })?.data ?? null;

      if (!data) throw new Error("question_payload_invalid");

      setEditQuestion(data);
      setShowEditDialog(true);
    } catch {
      toast({ title: "خطأ", description: "فشل تحميل بيانات السؤال للتعديل", variant: "destructive" });
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleDuplicate = () => {
    toast({ title: "قريبًا", description: "ميزة نسخ السؤال سيتم إضافتها لاحقًا" });
  };

  const handleExport = () => {
    toast({ title: "قريبًا", description: "ميزة تصدير السؤال سيتم إضافتها لاحقًا" });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoadingEdit} aria-label="Open actions menu">
            <span className="sr-only">فتح القائمة</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="ml-2 h-4 w-4" />
            عرض التفاصيل
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleOpenEdit} disabled={isLoadingEdit}>
            <Edit className="ml-2 h-4 w-4" />
            {isLoadingEdit ? "جاري التحميل..." : "تعديل"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="ml-2 h-4 w-4" />
            نسخ السؤال
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ✅ نمرر السؤال الكامل */}
      <QuestionDialog
        key={editQuestion?.id ?? "edit"} // لضمان إعادة التهيئة عند تغيير السؤال
        question={editQuestion ?? undefined}
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditQuestion(null);
        }}
      />

      <DeleteQuestionDialog question={question as unknown as QuestionWithRelations} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
    </>
  );
}

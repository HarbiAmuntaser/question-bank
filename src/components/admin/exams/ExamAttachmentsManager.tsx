"use client";

import { useState } from "react";
import { Download, Paperclip, Trash2 } from "lucide-react";

import { deleteAttachmentAction } from "@/app/admin/exams/actions";
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
import { useToast } from "@/hooks/use-toast";

import { ExamAttachmentDialog } from "./ExamAttachmentDialog";

type AttachmentRecord = {
  id: string;
  ownerId: string;
  ownerType: string;
  kind: "image" | "pdf" | "solution" | "other";
  url: string;
  title?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
};

const kindLabels: Record<AttachmentRecord["kind"], string> = {
  image: "صورة",
  pdf: "ملف PDF",
  solution: "نموذج حل",
  other: "أخرى",
};

export function ExamAttachmentsManager({
  examId,
  attachments,
  onChanged,
}: {
  examId: string;
  attachments: AttachmentRecord[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttachmentRecord | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const attachment = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(attachment.id);
    const res = await deleteAttachmentAction(attachment.id);
    setDeletingId(null);
    if (!res.success) {
      toast({ title: "خطأ", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحذف", description: "تم حذف المرفق بنجاح." });
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" aria-hidden />
            مرفقات الورقة
          </CardTitle>
          <CardDescription>إدارة الملفات والصور المرتبطة بورقة الامتحان.</CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)}>إضافة مرفق</Button>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">لا توجد مرفقات حالياً.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>تاريخ الإضافة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="font-medium">{attachment.title ?? "بدون عنوان"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{kindLabels[attachment.kind] ?? attachment.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      <a href={attachment.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        فتح الرابط
                      </a>
                    </TableCell>
                    <TableCell className="arabic-numbers">
                      {new Date(attachment.createdAt).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={attachment.url} target="_blank" rel="noreferrer" aria-label="تحميل المرفق">
                            <Download className="h-4 w-4" aria-hidden />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === attachment.id}
                          aria-label="حذف المرفق"
                          onClick={() => setDeleteTarget(attachment)}
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

      <ExamAttachmentDialog
        open={dialogOpen}
        onOpenChange={(next) => setDialogOpen(next)}
        examId={examId}
        onUploaded={() => {
          setDialogOpen(false);
          onChanged();
        }}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المرفق؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المرفق من ورقة الامتحان. لا يمكن التراجع عن هذه العملية.
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

// src/components/admin/exams/ExamAttachmentsManager.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteAttachmentAction } from "@/app/admin/exams/actions";
import { ExamAttachmentDialog } from "./ExamAttachmentDialog";

type AttachmentRecord = {
  id: string;
  ownerId: string;
  ownerType: string;
  kind: "image" | "pdf" | "solution" | "other";
  url: string;
  title?: string | null;
  meta?: Record<string, any> | null;
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

  async function handleDelete(attachment: AttachmentRecord) {
    if (!confirm("هل ترغب بحذف هذا المرفق؟")) return;
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
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
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
          <div className="rounded-md border">
            <Table>
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
                          <a href={attachment.url} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === attachment.id}
                          onClick={() => handleDelete(attachment)}
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

      <ExamAttachmentDialog
        open={dialogOpen}
        onOpenChange={(next) => setDialogOpen(next)}
        examId={examId}
        onUploaded={() => {
          setDialogOpen(false);
          onChanged();
        }}
      />
    </Card>
  );
}

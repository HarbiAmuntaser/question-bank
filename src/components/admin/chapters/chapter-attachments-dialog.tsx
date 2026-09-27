"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";

import {
  chapterAttachmentPurposeLabels,
  chapterAttachmentPurposes,
  readChapterAttachmentPurpose,
  type ChapterAttachmentPurpose,
} from "@/lib/chapter-attachments";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChapterWithRelations } from "@/types";

type ChapterAttachmentRow = {
  id: string;
  title: string | null;
  originalName: string | null;
  sizeBytes: number | null;
  createdAt: string;
  meta: unknown;
};

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes < 1024) return sizeBytes ? `${sizeBytes} B` : null;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChapterAttachmentsDialog({
  chapter,
  open,
  onOpenChange,
}: {
  chapter: ChapterWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ChapterAttachmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<ChapterAttachmentRow | null>(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<ChapterAttachmentPurpose>("chapter-question-bank");
  const [file, setFile] = useState<File | null>(null);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ownerType: "chapter", ownerId: chapter.id, pageSize: "100" });
      const response = await fetch(`/api/v1/admin/attachments?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "attachments_load_failed");
      const rows = Array.isArray(body?.data) ? body.data as ChapterAttachmentRow[] : [];
      setAttachments(rows.filter((item) => readChapterAttachmentPurpose(item.meta)));
    } catch (error) {
      toast({
        title: "تعذر تحميل المرفقات",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحميل مرفقات الفصل.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chapter.id, toast]);

  useEffect(() => {
    if (!open) return;
    void loadAttachments();
  }, [loadAttachments, open]);

  const upload = async () => {
    if (!file) {
      toast({ title: "اختر ملف PDF", variant: "destructive" });
      return;
    }
    if (file.type !== "application/pdf") {
      toast({ title: "نوع الملف غير مدعوم", description: "يسمح بملفات PDF فقط.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerType", "chapter");
    formData.append("ownerId", chapter.id);
    formData.append("kind", "pdf");
    formData.append("visibility", "private");
    formData.append("purpose", purpose);
    formData.append("title", title.trim() || file.name);

    setUploading(true);
    try {
      const response = await fetch("/api/v1/admin/attachments", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "attachment_upload_failed");
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAttachments();
      toast({ title: "تم رفع الملف", description: "أصبح المرفق متاحًا عبر رابط محمي للطلاب المصرح لهم." });
    } catch (error) {
      toast({
        title: "تعذر رفع الملف",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع الملف.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/v1/admin/attachments/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "attachment_delete_failed");
      setAttachments((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast({ title: "تم حذف المرفق" });
    } catch (error) {
      toast({
        title: "تعذر حذف المرفق",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف المرفق.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>مرفقات الفصل</DialogTitle>
            <DialogDescription>{chapter.name} - ملفات PDF خاصة تُفتح بعد التحقق من صلاحية الوصول.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 border-b pb-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chapter-attachment-purpose">نوع الملف</Label>
              <Select value={purpose} onValueChange={(value) => setPurpose(value as ChapterAttachmentPurpose)}>
                <SelectTrigger id="chapter-attachment-purpose"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {chapterAttachmentPurposes.map((value) => (
                    <SelectItem key={value} value={value}>{chapterAttachmentPurposeLabels[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter-attachment-title">العنوان</Label>
              <Input id="chapter-attachment-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="اختياري" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="chapter-attachment-file">ملف PDF</Label>
              <Input
                ref={fileInputRef}
                id="chapter-attachment-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">الحد الأقصى 25MB.</p>
            </div>
            <Button type="button" onClick={upload} disabled={uploading || !file} className="sm:col-span-2 sm:justify-self-start">
              {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
              رفع الملف
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex min-h-24 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : attachments.length ? attachments.map((attachment) => {
              const attachmentPurpose = readChapterAttachmentPurpose(attachment.meta);
              const size = formatFileSize(attachment.sizeBytes);
              return (
                <div key={attachment.id} className="flex items-center gap-3 rounded-md border p-3">
                  <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{attachment.title || attachment.originalName || "ملف PDF"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {attachmentPurpose ? chapterAttachmentPurposeLabels[attachmentPurpose] : "مرفق"}
                      {size ? ` · ${size}` : ""}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDeleting(attachment)} aria-label="حذف المرفق">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            }) : (
              <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">لا توجد مرفقات لهذا الفصل.</div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(nextOpen) => !nextOpen && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المرفق؟</AlertDialogTitle>
            <AlertDialogDescription>سيُحذف الملف من التخزين نهائيًا، ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

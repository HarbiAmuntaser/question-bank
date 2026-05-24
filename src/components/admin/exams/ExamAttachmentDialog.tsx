// src/components/admin/exams/ExamAttachmentDialog.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const kindOptions = [
  { value: "pdf", label: "ملف PDF" },
  { value: "image", label: "صورة" },
  { value: "solution", label: "نموذج حل" },
  { value: "other", label: "أخرى" },
] as const;

type UploadMode = "file" | "url";

export function ExamAttachmentDialog({
  open,
  onOpenChange,
  examId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  examId: string;
  onUploaded?: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<string>("pdf");
  const [title, setTitle] = useState("");
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setKind("pdf");
      setTitle("");
      setUploadMode("file");
      setFileUrl("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  function submit() {
    if (uploadMode === "file" && !selectedFile) {
      toast({ title: "تنبيه", description: "يرجى اختيار ملف للرفع.", variant: "destructive" });
      return;
    }
    if (uploadMode === "url" && !fileUrl.trim()) {
      toast({ title: "تنبيه", description: "يرجى إدخال رابط الملف.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("ownerType", "exam");
    formData.append("ownerId", examId);
    formData.append("kind", kind);
    if (title.trim()) formData.append("title", title.trim());
    if (uploadMode === "file" && selectedFile) {
      formData.append("file", selectedFile);
    } else if (uploadMode === "url") {
      formData.append("url", fileUrl.trim());
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/admin/attachments", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: "خطأ", description: data?.message ?? "فشل رفع المرفق", variant: "destructive" });
          return;
        }
        toast({ title: "تم الحفظ", description: "تم إضافة المرفق بنجاح." });
        onUploaded?.();
        onOpenChange(false);
      } catch (error) {
        toast({ title: "خطأ", description: "حدث خطأ أثناء رفع المرفق.", variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>إضافة مرفق</DialogTitle>
          <DialogDescription>قم برفع ملف أو ربطه عبر رابط خارجي.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>عنوان المرفق (اختياري)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: ملف الحلول" />
          </div>

          <div className="space-y-2">
            <Label>نوع المرفق</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>طريقة الإضافة</Label>
            <RadioGroup value={uploadMode} onValueChange={(value) => setUploadMode(value as UploadMode)} className="flex gap-4">
              <label className="flex items-center gap-2">
                <RadioGroupItem value="file" /> رفع ملف
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="url" /> رابط خارجي
              </label>
            </RadioGroup>
          </div>

          {uploadMode === "file" ? (
            <div className="space-y-2">
              <Label>اختر ملفاً</Label>
              <Input ref={fileInputRef} type="file" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">سيتم تخزين الملف داخل مجلد uploads/attachments.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>رابط الملف</Label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://example.com/file.pdf" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? "جاري الرفع..." : "حفظ المرفق"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

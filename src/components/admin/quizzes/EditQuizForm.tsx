"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateQuizAction } from "@/app/admin/quizzes/actions";
import { useRouter } from "next/navigation";

type QuizAccessType = "inherit" | "free" | "paid";

export default function EditQuizForm({ quiz }: { quiz: any }) {
  const [title, setTitle] = useState<string>(quiz.title ?? "");
  const [description, setDescription] = useState<string>(quiz.description ?? "");
  const [timeLimit, setTimeLimit] = useState<number>(quiz.timeLimit ?? 30);
  const [isActive, setIsActive] = useState<boolean>(quiz.isActive ?? true);
  const [accessType, setAccessType] = useState<QuizAccessType>(quiz.accessType ?? "inherit");
  const [isFreePreview, setIsFreePreview] = useState<boolean>(quiz.isFreePreview ?? false);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const submit = () => {
    start(async () => {
      const r = await updateQuizAction(quiz.id, {
        title,
        description: description || null,
        timeLimit: Number(timeLimit) || 30,
        isActive,
        accessType,
        isFreePreview,
      });
      if (r.success) {
        toast({ title: "تم الحفظ", description: r.message });
        router.refresh();
      } else {
        toast({ title: "خطأ", description: r.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">العنوان</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeLimit">الوقت (د)</Label>
          <Input id="timeLimit" type="number" min={1} max={180}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value) || 30)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">الوصف</Label>
        <Textarea id="description" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} id="isActive" />
        <Label htmlFor="isActive">نشط</Label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accessType">نوع الوصول</Label>
          <Select value={accessType} onValueChange={(value: QuizAccessType) => setAccessType(value)}>
            <SelectTrigger id="accessType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">يرث من الخطة</SelectItem>
              <SelectItem value="free">مجاني</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch checked={isFreePreview} onCheckedChange={(v) => setIsFreePreview(Boolean(v))} id="isFreePreview" />
          <div className="space-y-1">
            <Label htmlFor="isFreePreview">معاينة مجانية</Label>
            <p className="text-xs text-muted-foreground">
              يظل هذا الاختبار مفتوحاً حتى إذا كان المقرر أو التخصص مدفوعاً.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={submit} disabled={pending}>
        {pending ? "جاري الحفظ..." : "حفظ التعديلات"}
      </Button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateQuizAction } from "@/app/admin/quizzes/actions";
import { useRouter } from "next/navigation";

export default function EditQuizForm({ quiz }: { quiz: any }) {
  const [title, setTitle] = useState<string>(quiz.title ?? "");
  const [description, setDescription] = useState<string>(quiz.description ?? "");
  const [timeLimit, setTimeLimit] = useState<number>(quiz.timeLimit ?? 30);
  const [isActive, setIsActive] = useState<boolean>(quiz.isActive ?? true);
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

      <Button onClick={submit} disabled={pending}>
        {pending ? "جاري الحفظ..." : "حفظ التعديلات"}
      </Button>
    </div>
  );
}

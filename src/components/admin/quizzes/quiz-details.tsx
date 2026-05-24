// src/components/admin/quizzes/quiz-details.tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateQuizAction, deleteQuizAction } from "@/app/admin/quizzes/actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function QuizDetails({ quiz }: { quiz: any }) {
  const router = useRouter();
  const [title, setTitle] = useState(quiz.title || "");
  const [description, setDescription] = useState(quiz.description || "");
  const [timeLimit, setTimeLimit] = useState<number>(quiz.timeLimit || 30);
  const [isActive, setIsActive] = useState<boolean>(!!quiz.isActive);
  const [isPending, startTransition] = useTransition();

  const onSave = () => {
    startTransition(async () => {
      await updateQuizAction(quiz.id, { title, description, timeLimit, isActive });
      router.refresh();
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      await deleteQuizAction(quiz.id);
      router.push("/admin/quizzes");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الاختبار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الوقت (دقيقة)</Label>
              <Input
                type="number"
                min={1}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Label>نشط</Label>
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} disabled={isPending}>حفظ</Button>
            <Button variant="destructive" onClick={onDelete} disabled={isPending}>حذف</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الأسئلة ({quiz._count?.questions ?? quiz.questions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quiz.questions?.length ? (
            quiz.questions.map((qq: any, idx: number) => (
              <div key={qq.id} className="p-3 border rounded-lg">
                <div className="flex justify-between mb-2">
                  <div className="font-medium">السؤال {idx + 1}</div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{qq.question?.questionType}</Badge>
                    <Badge>{qq.question?.points} نقطة</Badge>
                  </div>
                </div>
                <div className="text-sm">{qq.question?.questionText}</div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">لا توجد أسئلة</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

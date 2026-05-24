"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type SettingsValue = {
  title: string;
  timeLimit: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  randomize: boolean;
};

export function QuizSettingsPanel({
  value,
  onChange,
}: {
  value: SettingsValue;
  onChange: (v: SettingsValue) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="quizTitle">عنوان الاختبار</Label>
        <Input
          id="quizTitle"
          placeholder="مثال: اختبار الفصل الأول - علوم الحاسب"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeLimit">الوقت المحدد (دقيقة)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={5}
            max={180}
            value={value.timeLimit}
            onChange={(e) => onChange({ ...value, timeLimit: Number(e.target.value) || 30 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">مستوى الصعوبة</Label>
          <Select
            value={value.difficulty}
            onValueChange={(v) =>
              onChange({
                ...value,
                difficulty: v as SettingsValue["difficulty"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mixed">مختلط</SelectItem>
              <SelectItem value="easy">سهل</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="hard">صعب</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="block">الخيارات</Label>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="randomize"
              checked={value.randomize}
              onCheckedChange={(checked) => onChange({ ...value, randomize: Boolean(checked) })}
            />
            <Label htmlFor="randomize" className="text-sm">
              ترتيب الأسئلة عشوائياً
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

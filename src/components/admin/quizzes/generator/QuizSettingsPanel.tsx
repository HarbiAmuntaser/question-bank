"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

type SettingsValue = {
  title: string;
  timeLimit: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  randomize: boolean;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accessType">نوع الوصول</Label>
          <Select
            value={value.accessType}
            onValueChange={(v) =>
              onChange({
                ...value,
                accessType: v as SettingsValue["accessType"],
              })
            }
          >
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
          <Switch
            id="isFreePreview"
            checked={value.isFreePreview}
            onCheckedChange={(checked) => onChange({ ...value, isFreePreview: Boolean(checked) })}
          />
          <div className="space-y-1">
            <Label htmlFor="isFreePreview">معاينة مجانية</Label>
            <p className="text-xs text-muted-foreground">
              يبقى الاختبار مفتوحاً حتى لو كان المقرر أو التخصص مدفوعاً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

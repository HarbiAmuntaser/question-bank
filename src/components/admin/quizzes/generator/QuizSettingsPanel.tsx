"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type GeneratorQuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay";

export type QuizGeneratorSettingsValue = {
  title: string;
  questionCount: number;
  timeLimit: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  questionTypes: GeneratorQuestionType[];
  randomize: boolean;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
};

const questionTypeLabels: Record<GeneratorQuestionType, string> = {
  multiple_choice: "اختيار متعدد",
  true_false: "صح أو خطأ",
  short_answer: "إجابة قصيرة",
  essay: "مقالي",
};

export function QuizSettingsPanel({
  value,
  onChange,
  availableCount,
}: {
  value: QuizGeneratorSettingsValue;
  onChange: (value: QuizGeneratorSettingsValue) => void;
  availableCount: number;
}) {
  const toggleQuestionType = (type: GeneratorQuestionType, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...value.questionTypes, type]))
      : value.questionTypes.filter((item) => item !== type);
    onChange({ ...value, questionTypes: next });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="quizTitle">عنوان الاختبار</Label>
        <Input
          id="quizTitle"
          placeholder="مثال: اختبار الفصل الأول - علوم الحاسب"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="questionCount">عدد الأسئلة</Label>
          <Input
            id="questionCount"
            type="number"
            min={1}
            max={100}
            value={value.questionCount}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange({ ...value, questionCount: Number.isFinite(next) ? Math.min(100, Math.max(1, next)) : 20 });
            }}
          />
          <p className="text-xs text-muted-foreground">
            المتاح وفق الفصول المختارة: {availableCount}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeLimit">الوقت المحدد بالدقائق</Label>
          <Input
            id="timeLimit"
            type="number"
            min={1}
            max={180}
            value={value.timeLimit}
            onChange={(event) => onChange({ ...value, timeLimit: Number(event.target.value) || 30 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">مستوى الصعوبة</Label>
          <Select
            value={value.difficulty}
            onValueChange={(next) =>
              onChange({ ...value, difficulty: next as QuizGeneratorSettingsValue["difficulty"] })
            }
          >
            <SelectTrigger id="difficulty">
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
      </div>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">أنواع الأسئلة</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(questionTypeLabels) as GeneratorQuestionType[]).map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={value.questionTypes.includes(type)}
                onCheckedChange={(checked) => toggleQuestionType(type, Boolean(checked))}
              />
              {questionTypeLabels[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="accessType">نوع الوصول</Label>
          <Select
            value={value.accessType}
            onValueChange={(next) =>
              onChange({ ...value, accessType: next as QuizGeneratorSettingsValue["accessType"] })
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
          <Checkbox
            id="randomize"
            checked={value.randomize}
            onCheckedChange={(checked) => onChange({ ...value, randomize: Boolean(checked) })}
          />
          <Label htmlFor="randomize">ترتيب الأسئلة عشوائيًا</Label>
        </div>

        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch
            id="isFreePreview"
            checked={value.isFreePreview}
            onCheckedChange={(checked) => onChange({ ...value, isFreePreview: Boolean(checked) })}
          />
          <div className="space-y-1">
            <Label htmlFor="isFreePreview">معاينة مجانية</Label>
            <p className="text-xs text-muted-foreground">تفتح الاختبار رغم سياسة الوصول الموروثة.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

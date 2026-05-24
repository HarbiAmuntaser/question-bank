// src/components/admin/questions/question-dialog/MultipleChoiceOptions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MCOption = { text: string; isCorrect: boolean };

export function MultipleChoiceOptions(props: {
  options: MCOption[];
  onChange: (next: MCOption[]) => void;
}) {
  const { options, onChange } = props;

  const setOptionText = (index: number, text: string) => {
    const next = options.slice();
    next[index] = { ...next[index], text };
    onChange(next);
  };

  // ✅ اجابة صحيحة واحدة فقط (Radio-like)
  const setCorrect = (index: number, checked: boolean) => {
    const currentCorrectCount = options.filter((o) => o.isCorrect).length;
    const isCurrent = options[index]?.isCorrect === true;

    // منع إلغاء آخر خيار صحيح
    if (!checked && isCurrent && currentCorrectCount === 1) return;

    const next = options.map((o, i) => {
      if (i === index) return { ...o, isCorrect: checked };
      return checked ? { ...o, isCorrect: false } : o; // إذا فعلنا خيار، ألغِ باقي الصح
    });

    onChange(next);
  };

  const addOption = () => onChange([...options, { text: "", isCorrect: false }]);
  const removeOption = (index: number) => onChange(options.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium">خيارات الإجابة</Label>
        <Button type="button" variant="secondary" onClick={addOption}>
          + إضافة خيار
        </Button>
      </div>

      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox checked={option.isCorrect} onCheckedChange={(v) => setCorrect(index, Boolean(v))} />
            <Label className="text-sm">صحيح</Label>
          </div>

          <Input
            placeholder={`الخيار ${index + 1}`}
            value={option.text}
            onChange={(e) => setOptionText(index, e.target.value)}
            className="flex-1"
          />

          {options.length > 2 && (
            <Button type="button" variant="ghost" onClick={() => removeOption(index)}>
              حذف
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

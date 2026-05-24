"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TrueFalseAnswer(props: {
  value: "true" | "false";
  onChange: (v: "true" | "false") => void;
}) {
  const { value, onChange } = props;

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">الإجابة الصحيحة</Label>
      <div className="col-span-3">
        <Select value={value} onValueChange={(v) => onChange(v as "true" | "false")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">صح</SelectItem>
            <SelectItem value="false">خطأ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

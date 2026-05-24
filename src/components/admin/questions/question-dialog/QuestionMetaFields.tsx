"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function QuestionMetaFields(props: {
  difficultyLevel: "easy" | "medium" | "hard";
  setDifficultyLevel: (v: "easy" | "medium" | "hard") => void;

  isActive: boolean;
  setIsActive: (v: boolean) => void;

  defaultPoints?: number;
  defaultExplanation?: string | null;
  defaultImageUrl?: string | null;
  defaultTags?: string;
}) {
  const {
    difficultyLevel,
    setDifficultyLevel,
    isActive,
    setIsActive,
    defaultPoints = 1,
    defaultExplanation,
    defaultImageUrl,
    defaultTags,
  } = props;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right col-span-2">مستوى الصعوبة</Label>
          <div className="col-span-2">
<Select
  value={difficultyLevel}
  onValueChange={(v) => {
    if (v === "easy" || v === "medium" || v === "hard") setDifficultyLevel(v);
  }}
>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">سهل</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="hard">صعب</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="points" className="text-right col-span-2">
            النقاط
          </Label>
          <Input id="points" name="points" type="number" min={1} max={10} defaultValue={defaultPoints} className="col-span-2" />
        </div>
      </div>

      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="explanation" className="text-right pt-2">
          التفسير
        </Label>
        <Textarea
          id="explanation"
          name="explanation"
          defaultValue={defaultExplanation ?? ""}
          className="col-span-3"
          placeholder="اكتب تفسير الإجابة الصحيحة..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="imageUrl" className="text-right">
          رابط الصورة
        </Label>
        <Input id="imageUrl" name="imageUrl" type="url" defaultValue={defaultImageUrl ?? ""} className="col-span-3" placeholder="https://..." />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tags" className="text-right">
          العلامات
        </Label>
        <Input id="tags" name="tags" defaultValue={defaultTags ?? ""} className="col-span-3" placeholder="خوارزميات, برمجة, أساسي" />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">نشط</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
    </>
  );
}

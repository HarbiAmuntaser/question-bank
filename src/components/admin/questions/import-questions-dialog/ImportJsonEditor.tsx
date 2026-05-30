import type React from "react";
import { Clipboard, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { IMPORT_CHUNK_SIZE, IMPORT_TEMPLATE } from "./constants";
import type { DuplicateStrategy } from "./types";

type ImportJsonEditorProps = {
  rawText: string;
  duplicateStrategy: DuplicateStrategy;
  showTemplate: boolean;
  isImporting: boolean;
  onRawTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onDuplicateStrategyChange: (value: DuplicateStrategy) => void;
  onToggleTemplate: () => void;
  onCopyTemplate: () => void;
};

export function ImportJsonEditor({
  rawText,
  duplicateStrategy,
  showTemplate,
  isImporting,
  onRawTextChange,
  onDuplicateStrategyChange,
  onToggleTemplate,
  onCopyTemplate,
}: ImportJsonEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label>الأسئلة (JSON / JSONL)</Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onToggleTemplate} disabled={isImporting}>
            <Eye className="ml-2 h-4 w-4" />
            {showTemplate ? "إخفاء القالب" : "عرض القالب"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCopyTemplate} disabled={isImporting}>
            <Clipboard className="ml-2 h-4 w-4" />
            نسخ القالب
          </Button>
        </div>
      </div>

      <Textarea
        className="min-h-[300px] font-mono text-sm leading-6"
        dir="ltr"
        placeholder={IMPORT_TEMPLATE}
        value={rawText}
        onChange={onRawTextChange}
        disabled={isImporting}
      />

      <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        <Label>التكرارات</Label>
        <Select
          value={duplicateStrategy}
          onValueChange={(value) => onDuplicateStrategyChange(value as DuplicateStrategy)}
          disabled={isImporting}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">تخطي المكرر</SelectItem>
            <SelectItem value="fail">إيقاف عند وجود تكرار</SelectItem>
            <SelectItem value="allow">السماح بالتكرار</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        يدعم JSON array، أو JSONL، أو كود داخل ```json، أو كائن يحتوي questions/items/data. الاستيراد يتم على دفعات من {IMPORT_CHUNK_SIZE} سؤال.
      </p>
    </div>
  );
}

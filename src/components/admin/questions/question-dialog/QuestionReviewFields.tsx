"use client";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function QuestionReviewFields({
  chapterId,
  reviewSummaryId,
  onReviewSummaryChange,
  defaultTopic,
  defaultPage,
}: {
  chapterId: string;
  reviewSummaryId: string;
  onReviewSummaryChange: (value: string) => void;
  defaultTopic?: string | null;
  defaultPage?: number | null;
}) {
  return (
    <div className="grid gap-4 rounded-md border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold">مرجع المراجعة</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          اختياري، ويظهر للطالب فقط تحت السؤال الخاطئ أو غير المجاب.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>الملخص المرجعي</Label>
          <AdminLookupCombobox
            type="summary"
            value={reviewSummaryId}
            onValueChange={onReviewSummaryChange}
            chapterId={chapterId}
            disabled={!chapterId}
            disablePortal
            placeholder={chapterId ? "ابحث عن ملخص تابع لنفس الفصل" : "اختر الفصل أولًا"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewTopic">عنوان الموضوع</Label>
          <Input
            id="reviewTopic"
            name="reviewTopic"
            defaultValue={defaultTopic ?? ""}
            maxLength={200}
            placeholder="Client-Server Architecture"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewPage">رقم صفحة PDF</Label>
          <Input
            id="reviewPage"
            name="reviewPage"
            type="number"
            min={1}
            step={1}
            defaultValue={defaultPage ?? ""}
            inputMode="numeric"
            placeholder="8"
          />
        </div>
      </div>
    </div>
  );
}

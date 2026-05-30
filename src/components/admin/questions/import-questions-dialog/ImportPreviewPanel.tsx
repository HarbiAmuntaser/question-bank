import { AlertCircle, CheckCircle2, Eye } from "lucide-react";

import { RichQuestionContent } from "@/components/shared/rich-question-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { IMPORT_TEMPLATE } from "./constants";
import type { DuplicateStrategy, ImportPreview, ImportProgressState, NormalizedImportItem } from "./types";

type ImportPreviewPanelProps = {
  preview: ImportPreview | null;
  previewRows: NormalizedImportItem[];
  importProgress: ImportProgressState;
  duplicateStrategy: DuplicateStrategy;
  showTemplate: boolean;
  processedCount: number;
  progressValue: number;
};

export function ImportPreviewPanel({
  preview,
  previewRows,
  importProgress,
  duplicateStrategy,
  showTemplate,
  processedCount,
  progressValue,
}: ImportPreviewPanelProps) {
  return (
    <div className="space-y-3">
      {importProgress.status !== "idle" ? (
        <Alert variant={importProgress.status === "error" ? "destructive" : "default"}>
          {importProgress.status === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>
            {importProgress.status === "running" ? "جاري الاستيراد" : importProgress.status === "success" ? "اكتمل الاستيراد" : "تعذر الاستيراد"}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <Progress value={progressValue} className="h-2" />
              <div className="flex items-center justify-between text-xs">
                <span>{processedCount} / {importProgress.total}</span>
                <span>{progressValue}%</span>
              </div>
              {importProgress.skipped > 0 ? (
                <div className="text-xs">تم تخطي {importProgress.skipped} سؤال مكرر.</div>
              ) : null}
              <div className="text-xs">
                الدفعة {importProgress.currentBatch} من {importProgress.totalBatches}
                {importProgress.failedBatch ? ` - فشلت الدفعة ${importProgress.failedBatch}` : ""}
              </div>
              {importProgress.message ? <div className="text-xs">{importProgress.message}</div> : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {showTemplate ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 text-sm font-medium">قالب مختصر</div>
          <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap text-xs" dir="ltr">
            {IMPORT_TEMPLATE}
          </pre>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <Alert variant={preview.errors.length ? "destructive" : "default"}>
            {preview.errors.length ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertTitle>{preview.errors.length ? "توجد أخطاء" : "جاهز للاستيراد"}</AlertTitle>
            <AlertDescription>
              {preview.errors.length ? "أصلح الأخطاء قبل الاستيراد." : `تم التحقق من ${preview.summary.total} سؤال.`}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Badge variant="secondary" className="justify-center">الإجمالي: {preview.summary.total}</Badge>
            <Badge variant="outline" className="justify-center">النقاط: {preview.summary.totalPoints}</Badge>
            <Badge variant="outline" className="justify-center">اختيار متعدد: {preview.summary.multipleChoice}</Badge>
            <Badge variant="outline" className="justify-center">صح/خطأ: {preview.summary.trueFalse}</Badge>
            <Badge variant="outline" className="justify-center">سهل: {preview.summary.easy}</Badge>
            <Badge variant="outline" className="justify-center">متوسط: {preview.summary.medium}</Badge>
            <Badge variant="outline" className="justify-center">صعب: {preview.summary.hard}</Badge>
            <Badge variant="outline" className="justify-center">بتفسير: {preview.summary.withExplanation}</Badge>
            <Badge variant="outline" className="justify-center">بعلامات: {preview.summary.withTags}</Badge>
            <Badge variant="outline" className="justify-center">بصورة: {preview.summary.withImage}</Badge>
            <Badge variant={preview.summary.duplicateInFile ? "destructive" : "outline"} className="justify-center">مكرر: {preview.summary.duplicateInFile}</Badge>
          </div>

          {preview.errors.length ? (
            <IssueList issues={preview.errors} />
          ) : preview.warnings.length && duplicateStrategy === "fail" ? (
            <IssueList issues={preview.warnings} />
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-auto">
              {previewRows.map((item, index) => (
                <div key={`${item.questionText}-${index}`} className="rounded-md border p-3 text-sm">
                  <div className="max-h-32 overflow-auto font-medium">
                    <span className="mb-1 block">{index + 1}.</span>
                    <RichQuestionContent content={item.questionText} className="space-y-2" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">{item.questionType === "multiple_choice" ? "اختيار متعدد" : "صح/خطأ"}</Badge>
                    <Badge variant="outline">{item.difficultyLevel}</Badge>
                    <Badge variant="outline">{item.points} نقطة</Badge>
                  </div>
                  {item.explanation ? (
                    <RichQuestionContent
                      content={item.explanation}
                      className="mt-2 max-h-24 overflow-auto text-xs text-muted-foreground"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertTitle>ابدأ بالتحقق</AlertTitle>
          <AlertDescription>
            ألصق JSON ثم اضغط تحقق ومعاينة لرؤية الأخطاء والملخص قبل الحفظ.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: Array<{ index?: number; message: string }> }) {
  return (
    <div className="max-h-[220px] space-y-2 overflow-auto rounded-md border border-destructive/30 p-3 text-sm text-destructive">
      {issues.slice(0, 20).map((issue, index) => (
        <div key={`${issue.index ?? "general"}-${index}`}>
          {issue.index ? `السؤال ${issue.index}: ` : ""}
          {issue.message}
        </div>
      ))}
      {issues.length > 20 ? <div>ويوجد {issues.length - 20} خطأ إضافي.</div> : null}
    </div>
  );
}

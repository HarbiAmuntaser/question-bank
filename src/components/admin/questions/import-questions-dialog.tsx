"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { IMPORT_CHUNK_SIZE, IMPORT_TEMPLATE } from "./import-questions-dialog/constants";
import { chunkItems, importChunk } from "./import-questions-dialog/import-api";
import { buildPreview } from "./import-questions-dialog/import-parser";
import { ImportJsonEditor } from "./import-questions-dialog/ImportJsonEditor";
import { ImportPathFields } from "./import-questions-dialog/ImportPathFields";
import { ImportPreviewPanel } from "./import-questions-dialog/ImportPreviewPanel";
import type {
  DuplicateStrategy,
  ImportPreview,
  ImportProgressState,
  NormalizedImportItem,
} from "./import-questions-dialog/types";

interface Props {
  children?: React.ReactNode;
}

export function ImportQuestionsDialog({ children }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [universityId, setUniversityId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    status: "idle",
    total: 0,
    imported: 0,
    skipped: 0,
    currentBatch: 0,
    totalBatches: 0,
  });

  const canImport = Boolean(
    chapterId &&
      preview &&
      preview.errors.length === 0 &&
      preview.items.length > 0 &&
      !isImporting &&
      !(duplicateStrategy === "fail" && preview.warnings.length > 0),
  );
  const processedCount = importProgress.imported + importProgress.skipped;
  const progressValue = importProgress.total > 0 ? Math.round((processedCount / importProgress.total) * 100) : 0;
  const previewRows = useMemo(() => preview?.items.slice(0, 8) ?? [], [preview]);

  const resetImportProgress = () => {
    setImportProgress({ status: "idle", total: 0, imported: 0, skipped: 0, currentBatch: 0, totalBatches: 0 });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isImporting && !nextOpen) return;
    setOpen(nextOpen);
  };

  const handleUniversityChange = (value: string) => {
    setUniversityId(value);
    setMajorId("");
    setSubjectId("");
    setChapterId("");
    resetImportProgress();
  };

  const handleMajorChange = (value: string) => {
    setMajorId(value);
    setSubjectId("");
    setChapterId("");
    resetImportProgress();
  };

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    setChapterId("");
    resetImportProgress();
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(event.target.value);
    setPreview(null);
    resetImportProgress();
  };

  const handleDuplicateStrategyChange = (value: DuplicateStrategy) => {
    setDuplicateStrategy(value);
    resetImportProgress();
  };

  const handlePreview = () => {
    const nextPreview = buildPreview(rawText);
    setPreview(nextPreview);
    resetImportProgress();

    if (nextPreview.errors.length) {
      toast({ title: "توجد أخطاء في JSON", description: "راجع قائمة الأخطاء قبل الاستيراد.", variant: "destructive" });
      return;
    }
    toast({ title: "JSON جاهز", description: `تم التحقق من ${nextPreview.items.length} سؤال.` });
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_TEMPLATE);
      toast({ title: "تم نسخ القالب", description: "ألصق القالب في أداة الذكاء الاصطناعي أو محرر JSON." });
    } catch {
      toast({ title: "تعذر النسخ", description: "انسخ القالب يدويًا من المربع.", variant: "destructive" });
    }
  };

  const importInChunks = async (items: NormalizedImportItem[]) => {
    const chunks = chunkItems(items, IMPORT_CHUNK_SIZE);
    let imported = 0;
    let skipped = 0;
    let currentBatch = 0;

    setIsImporting(true);
    setImportProgress({
      status: "running",
      total: items.length,
      imported: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: chunks.length,
      message: `سيتم الاستيراد على ${chunks.length} دفعة.`,
    });

    try {
      for (let index = 0; index < chunks.length; index += 1) {
        currentBatch = index + 1;
        setImportProgress((current) => ({
          ...current,
          status: "running",
          currentBatch,
          message: `جاري استيراد الدفعة ${currentBatch} من ${chunks.length}...`,
        }));

        const result = await importChunk(chapterId, chunks[index], duplicateStrategy);
        imported += result.imported;
        skipped += result.skipped;

        setImportProgress((current) => ({
          ...current,
          status: "running",
          imported,
          skipped,
          currentBatch,
          message: `تم استيراد ${imported} من ${items.length} سؤال.`,
        }));
      }

      setImportProgress({
        status: "success",
        total: items.length,
        imported,
        skipped,
        currentBatch: chunks.length,
        totalBatches: chunks.length,
        message: `تم استيراد ${imported} سؤال بنجاح.`,
      });
      router.refresh();
      toast({ title: "تم الاستيراد", description: `تم استيراد ${imported} سؤال على ${chunks.length} دفعة.` });
    } catch (error) {
      const failedBatch = currentBatch || undefined;
      const message = error instanceof Error ? error.message : "فشل الاستيراد";
      setImportProgress((current) => ({
        ...current,
        status: "error",
        failedBatch,
        message,
      }));
      toast({ title: "فشل الاستيراد", description: message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (!chapterId) {
      toast({ title: "خطأ", description: "اختر فصلًا أولًا.", variant: "destructive" });
      return;
    }

    const activePreview = preview?.sourceText === rawText ? preview : buildPreview(rawText);
    setPreview(activePreview);

    if (activePreview.errors.length || activePreview.items.length === 0) {
      toast({ title: "لا يمكن الاستيراد", description: "تحقق من JSON وأصلح الأخطاء أولًا.", variant: "destructive" });
      return;
    }

    void importInChunks(activePreview.items);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>استيراد أسئلة (JSON / JSONL)</DialogTitle>
          <DialogDescription>
            اختر المسار التعليمي، ثم ألصق الأسئلة وتحقق منها قبل الاستيراد.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <ImportPathFields
            universityId={universityId}
            majorId={majorId}
            subjectId={subjectId}
            chapterId={chapterId}
            isImporting={isImporting}
            onUniversityChange={handleUniversityChange}
            onMajorChange={handleMajorChange}
            onSubjectChange={handleSubjectChange}
            onChapterChange={setChapterId}
          />

          <Separator />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ImportJsonEditor
              rawText={rawText}
              duplicateStrategy={duplicateStrategy}
              showTemplate={showTemplate}
              isImporting={isImporting}
              onRawTextChange={handleTextChange}
              onDuplicateStrategyChange={handleDuplicateStrategyChange}
              onToggleTemplate={() => setShowTemplate((value) => !value)}
              onCopyTemplate={copyTemplate}
            />

            <ImportPreviewPanel
              preview={preview}
              previewRows={previewRows}
              importProgress={importProgress}
              duplicateStrategy={duplicateStrategy}
              showTemplate={showTemplate}
              processedCount={processedCount}
              progressValue={progressValue}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handlePreview} disabled={!rawText.trim() || isImporting}>
            تحقق ومعاينة
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {isImporting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الاستيراد...
              </>
            ) : (
              "استيراد الأسئلة"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

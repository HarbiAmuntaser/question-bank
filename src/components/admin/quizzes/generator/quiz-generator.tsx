"use client";

import { useCallback, useState } from "react";
import { Download, Eye, Loader2, Shuffle } from "lucide-react";

import {
  exportQuizAction,
  generateQuizAction,
  getQuizPreviewAction,
  type QuizGenerationSettings,
} from "@/app/admin/quiz-generator/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { QuestionWithRelations } from "@/types";

import { QuizPreviewDialog } from "../quiz-preview-dialog";
import { ChapterCascader } from "./ChapterCascader";
import {
  QuizSettingsPanel,
  type QuizGeneratorSettingsValue,
} from "./QuizSettingsPanel";

const initialSettings: QuizGeneratorSettingsValue = {
  title: "",
  questionCount: 20,
  timeLimit: 30,
  difficulty: "mixed",
  questionTypes: ["multiple_choice", "true_false", "short_answer", "essay"],
  randomize: true,
  accessType: "inherit",
  isFreePreview: false,
};

type PreviewData = {
  questions: QuestionWithRelations[];
  stats: {
    totalAvailable: number;
    selectedCount: number;
    byDifficulty: Record<string, number>;
    byType: Record<string, number>;
    totalPoints: number;
  };
};

export function QuizGenerator() {
  const { toast } = useToast();
  const [quizSettings, setQuizSettings] = useState<QuizGeneratorSettingsValue>(initialSettings);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const handleAvailableCountChange = useCallback((count: number) => {
    setAvailableCount(count);
  }, []);

  const validateSelection = (requireTitle: boolean) => {
    if (requireTitle && !quizSettings.title.trim()) {
      toast({ title: "بيانات ناقصة", description: "أدخل عنوان الاختبار.", variant: "destructive" });
      return false;
    }
    if (selectedChapters.length === 0) {
      toast({ title: "بيانات ناقصة", description: "اختر فصلًا واحدًا على الأقل.", variant: "destructive" });
      return false;
    }
    if (quizSettings.questionTypes.length === 0) {
      toast({ title: "بيانات ناقصة", description: "اختر نوع سؤال واحدًا على الأقل.", variant: "destructive" });
      return false;
    }
    if (availableCount === 0) {
      toast({ title: "لا توجد أسئلة", description: "الفصول المختارة لا تحتوي أسئلة نشطة.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const buildPayload = (titleFallback = false): QuizGenerationSettings => ({
    title: quizSettings.title.trim() || (titleFallback ? "اختبار" : ""),
    questionCount: quizSettings.questionCount,
    timeLimit: quizSettings.timeLimit,
    difficulty: quizSettings.difficulty,
    questionTypes: quizSettings.questionTypes,
    randomize: quizSettings.randomize,
    selectedChapters,
    accessType: quizSettings.accessType,
    isFreePreview: quizSettings.isFreePreview,
  });

  const handlePreview = async () => {
    if (!validateSelection(false)) return;
    setIsPreviewing(true);
    try {
      const result = await getQuizPreviewAction(buildPayload(true));
      if (!result.success) {
        toast({ title: "تعذرت المعاينة", description: result.message, variant: "destructive" });
        return;
      }
      setPreviewData({ questions: result.questions ?? [], stats: result.stats });
      setShowPreview(true);
    } catch {
      toast({ title: "تعذرت المعاينة", description: "حدث خطأ أثناء تحميل المعاينة.", variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateSelection(true)) return;
    setIsGenerating(true);
    try {
      const result = await generateQuizAction(buildPayload());
      if (!result.success) {
        toast({ title: "تعذر الإنشاء", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "تم إنشاء الاختبار", description: result.message });
      setQuizSettings(initialSettings);
      setSelectedChapters([]);
      setAvailableCount(0);
      setPreviewData(null);
    } catch {
      toast({ title: "تعذر الإنشاء", description: "حدث خطأ غير متوقع.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!validateSelection(false)) return;
    setIsExporting(true);
    try {
      const result = await exportQuizAction(buildPayload(true), "json");
      if (!result.success || !result.data || !result.filename) {
        toast({ title: "تعذر التصدير", description: result.message, variant: "destructive" });
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ title: "تم التصدير", description: result.message });
    } catch {
      toast({ title: "تعذر التصدير", description: "حدث خطأ أثناء تجهيز الملف.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <QuizSettingsPanel
        value={quizSettings}
        onChange={setQuizSettings}
        availableCount={availableCount}
      />

      <ChapterCascader
        selectedChapters={selectedChapters}
        onChange={setSelectedChapters}
        onAvailableCountChange={handleAvailableCountChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          onClick={handleGenerate}
          disabled={selectedChapters.length === 0 || isGenerating}
          className="gap-2"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
          {isGenerating ? "جار الإنشاء..." : "إنشاء الاختبار"}
        </Button>

        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={selectedChapters.length === 0 || isPreviewing}
          className="gap-2"
        >
          {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {isPreviewing ? "جار التحميل..." : "معاينة"}
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={selectedChapters.length === 0 || isExporting}
          className="gap-2"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? "جار التجهيز..." : "تصدير JSON"}
        </Button>
      </div>

      {previewData ? (
        <QuizPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          questions={previewData.questions}
          stats={previewData.stats}
          settings={{
            title: quizSettings.title || "اختبار",
            questionCount: previewData.stats.selectedCount,
            timeLimit: quizSettings.timeLimit,
            difficulty: quizSettings.difficulty,
          }}
        />
      ) : null}
    </div>
  );
}

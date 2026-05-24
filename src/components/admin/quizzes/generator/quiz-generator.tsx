"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shuffle, Download, Eye } from "lucide-react";

import { QuizSettingsPanel } from "./QuizSettingsPanel";
import { ChapterCascader } from "./ChapterCascader";

import {
  generateQuizAction,
  getQuizPreviewAction,
  exportQuizAction,
} from "@/app/admin/quiz-generator/actions";
import type { QuestionWithRelations } from "@/types";
import { QuizPreviewDialog } from "../quiz-preview-dialog";

type ExportOk = {
  success: true;
  message: string;
  data: any;
  filename: string;
};

export function QuizGenerator() {
  const { toast } = useToast();

  // أبقينا الإعدادات الأساسية فقط (بدون questionTypes وبدون إدخال يدوي لـ questionCount)
  const [quizSettings, setQuizSettings] = useState({
    title: "",
    timeLimit: 30,
    difficulty: "mixed" as "mixed" | "easy" | "medium" | "hard",
    randomize: true,
  });

  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] =
    useState<{ questions: QuestionWithRelations[]; stats: any } | null>(null);

  // عدد الأسئلة المتاح (من نتيجة المعاينة الأخيرة إن وُجدت)
  const availableCount = useMemo(() => {
    if (previewData?.stats?.totalAvailable != null) return previewData.stats.totalAvailable as number;
    // لو تبي احتسابًا سريعًا محليًا: نتركه 0 حتى تجيب المعاينة
    return 0;
  }, [previewData]);

  const handlePreview = async () => {
    if (selectedChapters.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار فصل واحد على الأقل", variant: "destructive" });
      return;
    }

    setIsPreviewing(true);
    try {
      // لا نرسل questionTypes (نرسل مصفوفة فارغة لإلغاء الفلترة)
      // نرسل questionCount كبير حتى يأتينا كل المتاح
      const r = await getQuizPreviewAction({
        title: quizSettings.title || "اختبار",
        questionCount: 10000,
        timeLimit: quizSettings.timeLimit,
        difficulty: quizSettings.difficulty,
        questionTypes: [], // ⬅️ إلغاء فلتر النوع
        randomize: quizSettings.randomize,
        selectedChapters,
      });

      if (r.success) {
        setPreviewData({ questions: r.questions!, stats: r.stats! });
        setShowPreview(true);
      } else {
        toast({ title: "خطأ", description: r.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء المعاينة", variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!quizSettings.title.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال عنوان للاختبار", variant: "destructive" });
      return;
    }
    if (selectedChapters.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار فصل واحد على الأقل", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      // إن وُجدت معاينة، استخدم مجموع المتاح، وإلا أرسل رقمًا كبيرًا (السيرفر سيقصّه على المتاح فعليًا)
      const count = availableCount > 0 ? availableCount : 10000;

      const r = await generateQuizAction({
        title: quizSettings.title,
        questionCount: count,                 // ⬅️ تلقائي
        timeLimit: quizSettings.timeLimit,
        difficulty: quizSettings.difficulty,
        questionTypes: [],                    // ⬅️ بدون فلترة النوع
        randomize: quizSettings.randomize,
        selectedChapters,
      });

      if (r.success) {
        toast({ title: "نجح", description: r.message });
        // إعادة ضبط
        setQuizSettings({
          title: "",
          timeLimit: 30,
          difficulty: "mixed",
          randomize: true,
        });
        setSelectedChapters([]);
        setPreviewData(null);
      } else {
        toast({ title: "خطأ", description: r.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (selectedChapters.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار فصل واحد على الأقل", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      // للتصدير أيضًا نلغي الفلترة على النوع ونأخذ كل المتاح
      const r = await exportQuizAction(
        {
          title: quizSettings.title || "اختبار",
          questionCount: 10000,
          timeLimit: quizSettings.timeLimit,
          difficulty: quizSettings.difficulty,
          questionTypes: [],
          randomize: quizSettings.randomize,
          selectedChapters,
        },
        "json",
      );

      if (r.success && "data" in r && "filename" in r) {
        const ok = r as ExportOk;
        const dataStr = JSON.stringify(ok.data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = ok.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ title: "نجح", description: ok.message });
      } else {
        toast({ title: "خطأ", description: (r as any).message ?? "فشل التصدير", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء التصدير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <QuizSettingsPanel value={quizSettings} onChange={setQuizSettings} />

      <div className="space-y-2">
        <ChapterCascader selectedChapters={selectedChapters} onChange={setSelectedChapters} />
        <div className="text-sm text-muted-foreground">
          عدد الأسئلة المتاحة من الفصول المختارة: <span className="arabic-numbers">{availableCount}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleGenerate} disabled={selectedChapters.length === 0 || isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              جاري الإنشاء...
            </>
          ) : (
            <>
              <Shuffle className="h-4 w-4" />
              إنشاء الاختبار
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={selectedChapters.length === 0 || isPreviewing}
          className="gap-2 bg-transparent"
        >
          {isPreviewing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              جاري التحميل...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              معاينة
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={selectedChapters.length === 0 || isExporting}
          className="gap-2 bg-transparent"
        >
          <Download className="h-4 w-4" />
          تصدير (JSON)
        </Button>
      </div>

   {previewData && (
  <QuizPreviewDialog
    open={showPreview}
    onOpenChange={setShowPreview}
    questions={previewData.questions ?? []}
    stats={previewData.stats ?? undefined}
    settings={{
      title: quizSettings.title || "اختبار",
      questionCount: previewData.stats?.selectedCount ?? previewData.questions?.length ?? 0,
      timeLimit: quizSettings.timeLimit,
      difficulty: quizSettings.difficulty,
    }}
  />
)}

    </div>
  );
}

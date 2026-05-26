// src/app/admin/questions/page.tsx
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { QuestionDialog } from "@/components/admin/questions/question-dialog";
import { QuestionsTable } from "@/components/admin/questions/questions-table";
import { ImportQuestionsDialog } from "@/components/admin/questions/import-questions-dialog";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    universityId?: string;
    majorId?: string;
    subjectId?: string;
    chapterId?: string;
  }>;
}) {
  // ✅ ننتظر searchParams هنا (الموضع الصحيح)
  const sp = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الأسئلة</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة بنك الأسئلة في النظام</p>
        </div>
        <QuestionDialog>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة سؤال
          </Button>
        </QuestionDialog>
        <ImportQuestionsDialog>
  <Button variant="outline">استيراد أسئلة (JSON)</Button>
</ImportQuestionsDialog>
        
      </div>

      <Suspense fallback={<TableSkeleton />}>
        {/* ✅ نمرر كائنًا عادياً بدلاً من API ديناميكي */}
        <QuestionsTable
          searchParams={{
            page: sp.page,
            sortBy: sp.sortBy,
            sortOrder: sp.sortOrder,
            universityId: sp.universityId,
            majorId: sp.majorId,
            subjectId: sp.subjectId,
            chapterId: sp.chapterId,
          }}
        />
      </Suspense>
    </div>
  );
}

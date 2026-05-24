import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { QuizzesFilters } from "@/components/admin/quizzes/QuizzesFilters";
import QuizzesTable from "@/components/admin/quizzes/QuizzesTable";

export default function QuizzesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الاختبارات المُنشأة</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">عرض وإدارة الاختبارات التي تم إنشاؤها</p>
      </div>

      {/* فلاتر */}
      <QuizzesFilters />

      <Suspense fallback={<TableSkeleton />}>
        {/* عميل: يقرأ useSearchParams ويطلب البيانات عبر أكشن */}
        <QuizzesTable />
      </Suspense>
    </div>
  );
}

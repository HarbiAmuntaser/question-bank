// src/app/admin/exams/page.tsx
"use client";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CreateExamButton } from "@/components/admin/exams/CreateExamButton";
import { ExamsList } from "@/components/admin/exams/ExamsList";

export default function ExamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">أوراق الاختبارات</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">عرض وإدارة أوراق الاختبارات الرسمية</p>
        </div>
        <CreateExamButton onCreated={() => {
          // سيعاد تحميل القائمة داخليًا عند إغلاق الديالوج (يمكنك تفعيل revalidateTag في الراوت)
          // هنا لا حاجة لفعل شيء؛ مكوّن القائمة يجلب مع التغيّرات عبر onSaved إن رغبت
        }} />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ExamsList />
      </Suspense>
    </div>
  );
}

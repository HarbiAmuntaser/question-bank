import { Suspense } from "react";
import type { Metadata } from "next";

import { SummariesTable, type SummariesSearchParams } from "@/components/admin/summaries/summaries-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export const metadata: Metadata = {
  title: "الملخصات الدراسية | مستواك",
};

export default async function AdminSummariesPage({
  searchParams,
}: {
  searchParams: Promise<SummariesSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">الملخصات الدراسية</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          إدارة ملخصات المواد وربطها بفصول اختيارية. هذه المرحلة مخصصة للإدارة فقط دون واجهة عامة للطالب.
        </p>
      </div>

      <Suspense
        fallback={<TableSkeleton columns={14} rows={8} />}
        key={[
          resolvedSearchParams.page ?? "1",
          resolvedSearchParams.query ?? "",
          resolvedSearchParams.status ?? "all",
          resolvedSearchParams.universityId ?? "",
          resolvedSearchParams.majorId ?? "",
          resolvedSearchParams.subjectId ?? "",
          resolvedSearchParams.chapterId ?? "",
          resolvedSearchParams.sortBy ?? "updatedAt",
          resolvedSearchParams.sortOrder ?? "desc",
        ].join("-")}
      >
        <SummariesTable searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

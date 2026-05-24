// src/app/admin/exams/[id]/page.tsx
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ExamDetails } from "@/components/admin/exams/ExamDetails";

export default async function ExamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<TableSkeleton />}>
        <ExamDetails id={id} />
      </Suspense>
    </div>
  );
}

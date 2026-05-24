// src/app/admin/subjects/page.tsx
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SubjectsTable } from "@/components/admin/subjects/subjects-table";
import { SubjectDialog } from "@/components/admin/subjects/subject-dialog";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    universityId?: string;
    majorId?: string;
  }>;
}) {
  const sp = await searchParams;
  const { page, query, sortBy, sortOrder, universityId, majorId } = sp;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">المقررات</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة المقررات الدراسية في النظام</p>
        </div>
        <SubjectDialog>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة مقرر
          </Button>
        </SubjectDialog>
      </div>

      <Suspense
        key={`${page ?? 1}-${query ?? ""}-${sortBy ?? "createdAt"}-${sortOrder ?? "desc"}-${universityId ?? ""}-${majorId ?? ""}`}
        fallback={<TableSkeleton columns={8} rows={10} />}
      >
        <SubjectsTable
          searchParams={{
            page,
            query,
            sortBy: sortBy as "name" | "createdAt" | "code",
            sortOrder: sortOrder as "asc" | "desc",
            universityId,
            majorId,
          }}
        />
      </Suspense>
    </div>
  );
}

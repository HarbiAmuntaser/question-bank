// src/app/admin/chapters/page.tsx
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ChapterDialog } from "@/components/admin/chapters/chapter-dialog";
import { ChaptersTable } from "@/components/admin/chapters/chapters-table";

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    universityId?: string;
    majorId?: string;
    subjectId?: string;
  }>;
}) {
  const sp = await searchParams;
  const { page, query, universityId, majorId, subjectId } = sp;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الفصول</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة فصول المقررات في النظام</p>
        </div>
        <ChapterDialog>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة فصل
          </Button>
        </ChapterDialog>
      </div>

      <Suspense
        fallback={<TableSkeleton rows={10} columns={10} />}
        key={`${page ?? 1}-${query ?? ""}-${universityId ?? ""}-${majorId ?? ""}-${subjectId ?? ""}`}
      >
        <ChaptersTable searchParams={{ page, query, universityId, majorId, subjectId }} />
      </Suspense>
    </div>
  );
}

// src/app/admin/majors/page.tsx
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { MajorDialog } from "@/components/admin/majors/major-dialog";
import { MajorsTable } from "@/components/admin/majors/majors-table";

export default async function MajorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    universityId?: string; // ✅ أضفناها هنا
  }>;
}) {
  const resolved = await searchParams;
  const { page, query, sortBy, sortOrder, universityId } = resolved; // ✅ نقرأها

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التخصصات</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            إدارة التخصصات الأكاديمية في النظام
          </p>
        </div>
        <MajorDialog>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة تخصص
          </Button>
        </MajorDialog>
      </div>

      <Suspense
        fallback={<TableSkeleton columns={8} rows={10} />}
        // ✅ ضفنا universityId للمفتاح كي يُعاد تحميل الجدول عند تغيّره
        key={`${query}-${page}-${sortBy}-${sortOrder}-${universityId ?? "__all__"}`}
      >
        <MajorsTable
          searchParams={{
            query,
            page,
            sortBy: sortBy as "name" | "createdAt" | "code" | undefined,
            sortOrder: sortOrder as "asc" | "desc" | undefined,
            universityId, // ✅ تمرير الفلتر للجدول
          }}
        />
      </Suspense>
    </div>
  );
}

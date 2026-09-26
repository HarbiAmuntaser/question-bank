import { Landmark, Plus } from "lucide-react";
import { Suspense } from "react";

import { CollegeDialog } from "@/components/admin/colleges/college-dialog";
import { CollegesTable } from "@/components/admin/colleges/colleges-table";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { requireAdminPage } from "@/lib/server/admin-page-auth";

export default async function CollegesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; universityId?: string }>;
}) {
  await requireAdminPage("colleges:read");

  const resolved = await searchParams;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" aria-hidden />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الكليات</h1>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            تنظيم تخصصات الجامعات ضمن كليات اختيارية.
          </p>
        </div>
        <CollegeDialog>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة كلية
          </Button>
        </CollegeDialog>
      </div>
      <Suspense
        key={`${resolved.page}-${resolved.query}-${resolved.universityId}`}
        fallback={<TableSkeleton columns={7} rows={10} />}
      >
        <CollegesTable searchParams={resolved} />
      </Suspense>
    </div>
  );
}

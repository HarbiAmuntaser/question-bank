// src/app/admin/universities/page.tsx

import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { UniversityDialog } from "@/components/admin/universities/university-dialog"
import { UniversitiesTable } from "@/components/admin/universities/universities-table"

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    query?: string
    sortBy?: string
    sortOrder?: string
   countryCode?: string;
    institutionType?: string;
  }>
}) {
  const resolvedSearchParams = await searchParams
  const { page, query, sortBy, sortOrder, countryCode, institutionType } = resolvedSearchParams

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الجامعات</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">إدارة الجامعات في النظام</p>
        </div>
        <UniversityDialog>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            إضافة جامعة
          </Button>
        </UniversityDialog>
      </div>

        <Suspense
          fallback={<TableSkeleton columns={5} rows={10} />}
        key={`${query}-${page}-${sortBy}-${sortOrder}-${countryCode}-${institutionType}`}
        >
          <UniversitiesTable
            searchParams={{
              query,
              page,
              sortBy: sortBy as "name" | "createdAt",
              sortOrder: sortOrder as "asc" | "desc",

            countryCode,
            institutionType,
            }}
          />
        </Suspense>
    </div>
  )
}
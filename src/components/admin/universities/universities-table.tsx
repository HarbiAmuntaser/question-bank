// src/components/admin/universities/universities-table.tsx
import { UniversitiesFilters } from "@/components/admin/universities/universities-filters";

import { getRequestOrigin } from "@/lib/server/request-origin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { SortButton } from "@/components/ui/SortButton";
import { Pagination } from "@/components/Pagination";
import { UniversityActions } from "./university-actions";
import { AdminTableShell } from "@/components/admin/admin-table-shell";

// ------- Types (حسب استجابة الـAPI) -------
export interface UniversityRow {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string | null;
  _count: { majors: number };

  countryCode: string; // مثال: "SA"
  institutionType: "university" | "school" | "academy";
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  data: UniversityRow[];
  pagination: PaginationMeta;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "") return;
    usp.set(k, String(v));
  });
  return usp.toString();
}

async function getApiBase(): Promise<string> {
  return getRequestOrigin();
}


async function fetchUniversities({
  page,
  pageSize,
  sortBy,
  sortOrder,
  query,
  // 👇 جديد
  countryCode,
  institutionType,
}: {
  page: number;
  pageSize: number;
  sortBy: "name" | "createdAt";
  sortOrder: "asc" | "desc";
  query: string;
  countryCode?: string;
  institutionType?: "" | "university" | "school" | "academy";
}): Promise<ListResponse> {
  const qs = buildQuery({ page, pageSize, sortBy, sortOrder, query, countryCode, institutionType });
  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/universities?${qs}`, {
    next: { revalidate: 3600, tags: ["universities"] },
  });
  if (!res.ok) {
    throw new Error("فشل تحميل الجامعات");
  }
  return (await res.json()) as ListResponse;
}

export async function UniversitiesTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    // 👇 جديد
    countryCode?: string;
    institutionType?: string;
  };
}) {
  const currentPage: number = Number(searchParams?.page ?? 1) || 1;
  const perPage = 10;
  const searchQuery: string = searchParams?.query ?? "";
  const sortBy: "name" | "createdAt" = searchParams?.sortBy === "name" ? "name" : "createdAt";
  const sortOrder: "asc" | "desc" = searchParams?.sortOrder === "asc" ? "asc" : "desc";

  // 👇 جديد
  const countryCode: string = searchParams?.countryCode ?? "";
  const institutionType: "university" | "school" | "academy" | "" =
    (searchParams?.institutionType as any) ?? "";

  const { data: universities, pagination } = await fetchUniversities({
    page: currentPage,
    pageSize: perPage,
    sortBy,
    sortOrder,
    query: searchQuery,
    // 👇 جديد
    countryCode,
    institutionType,
  });


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="ابحث عن جامعة..." />
                    <UniversitiesFilters />

        <div className="flex flex-wrap gap-2">
          <SortButton sortBy="name" currentSort={sortBy} sortOrder={sortOrder}>
            الترتيب بالاسم
          </SortButton>
          <SortButton
            sortBy="createdAt"
            currentSort={sortBy}
            sortOrder={sortOrder}
          >
            الترتيب بالتاريخ
          </SortButton>

        </div>
      </div>

      <AdminTableShell minWidth="min-w-[980px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الجامعة</TableHead>
              <TableHead>الرمز</TableHead>
              <TableHead>الموقع</TableHead>
              {/* 👇 جديد */}
              <TableHead>الدولة</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {universities.map((university) => (
              <TableRow key={university.id}>
                <TableCell>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={university.logoUrl ?? ""}
                        alt={university.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {university.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{university.name}</div>
                      <div className="text-sm text-gray-500">
                        {university._count.majors} تخصص
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {university.code ?? "غير محدد"}
                  </code>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {university.city && university.region
                      ? `${university.city}، ${university.region}`
                      : university.city ?? university.region ?? "غير محدد"}
                  </div>
                </TableCell>
                {/* 👇 جديد — الدولة */}
                <TableCell>
                  <Badge variant="secondary">
                    {university.countryCode || "—"}
                  </Badge>
                </TableCell>

                {/* 👇 جديد — النوع */}
                <TableCell>
                  <Badge>
                    {university.institutionType === "university"
                      ? "جامعة"
                      : university.institutionType === "school"
                      ? "مدرسة"
                      : "أكاديمية"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={university.isActive ? "default" : "secondary"}
                  >
                    {university.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground arabic-numbers">
                    {new Date(university.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <UniversityActions university={university} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableShell>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}

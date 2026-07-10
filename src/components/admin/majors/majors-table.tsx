// src/components/admin/majors/majors-table.tsx

import { adminApiFetch } from "@/lib/server/admin-api-fetch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/Pagination";
import { MajorActions } from "./major-actions";
import { UniversityFilter } from "./UniversityFilter";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { getDegreeTypeLabel } from "@/lib/degree-types";

// ------- Types matching API -------
export interface MajorRow {
  id: string;
  name: string;
  code: string | null;
  degreeType: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  university: { id: string; name: string; code: string | null };
  subjectsCount: number;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
interface ListResponse {
  data: MajorRow[];
  pagination: PaginationMeta;
}

export interface UniversityOption {
  id: string;
  name: string;
  code: string | null;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === "undefined") return;
    usp.set(k, String(v));
  });
  return usp.toString();
}

async function fetchMajors(args: {
  page: number;
  pageSize: number;
  query: string;
  universityId?: string;
}): Promise<ListResponse> {
  const qs = buildQuery(args);
  const res = await adminApiFetch(`/api/v1/admin/majors?${qs}`, {
    next: { revalidate: 3600, tags: ["majors"] },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const info = body || `status=${res.status}`;
    throw new Error(`فشل تحميل التخصصات: ${info}`);
  }
  return (await res.json()) as ListResponse;
}

async function fetchUniversitiesForFilter(): Promise<UniversityOption[]> {
  return [];
}

export async function MajorsTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    query?: string;
    universityId?: string;
  };
}) {
  // ---- read current query params from server ----
  const currentPage = Number(searchParams?.page ?? 1) || 1;
  const perPage = 10;
  const searchQuery = searchParams?.query ?? "";
  // اجعل القيمة المُتحكّم بها للفلتر واضحة وصريحة
  const selectedUniversityId = searchParams?.universityId && searchParams.universityId.length > 0
    ? searchParams.universityId
    : undefined;

  // ---- fetch data in parallel ----
  const [universities, { data: majors, pagination }] = await Promise.all([
    fetchUniversitiesForFilter(),
    fetchMajors({
      page: currentPage,
      pageSize: perPage,
      query: searchQuery,
      universityId: selectedUniversityId, // ✅ يرسل الفلتر فعليًا
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="ابحث عن تخصص..." />
        <div className="flex flex-wrap items-center gap-2">
          <UniversityFilter
            options={universities}
            // ✅ نجعل القيمة مُتحكّم بها دومًا
            value={selectedUniversityId ?? "__all__"}
            placeholder="تصفية حسب الجامعة"
          />
        </div>
      </div>

      <AdminTableShell minWidth="min-w-[980px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التخصص</TableHead>
              <TableHead>الجامعة</TableHead>
              <TableHead>الرمز</TableHead>
              <TableHead>نوع الدرجة</TableHead>
              <TableHead>عدد المقررات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {majors.map((major) => (
              <TableRow key={major.id}>
                <TableCell>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {major.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{major.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{major.university.name}</div>
                  <div className="text-xs text-muted-foreground">{major.university.code ?? ""}</div>
                </TableCell>
                <TableCell>
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {major.code ?? "غير محدد"}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getDegreeTypeLabel(major.degreeType)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm arabic-numbers">{major.subjectsCount}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={major.isActive ? "default" : "secondary"}>
                    {major.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground arabic-numbers">
                    {new Date(major.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <MajorActions
                    major={{
                      id: major.id,
                      name: major.name,
                      code: major.code,
                      degreeType: major.degreeType,
                      durationYears: null, // غير مطلوب هنا
                      isActive: major.isActive,
                      createdAt: major.createdAt,
                      updatedAt: major.updatedAt,
                      universityId: major.university.id, // ✅ المكوّن ينتظر universityId فقط
                    }}
                  />
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

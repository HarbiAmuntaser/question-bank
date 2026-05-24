// src/components/admin/majors/majors-table.tsx

import { headers as nextHeaders } from "next/headers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { SortButton } from "@/components/ui/SortButton";
import { Pagination } from "@/components/Pagination";
import { MajorActions } from "./major-actions";
import { UniversityFilter } from "./UniversityFilter";

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

async function getApiBase(): Promise<string> {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (envBase && envBase.length > 0) return envBase;
  const h = await nextHeaders();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchMajors(args: {
  page: number;
  pageSize: number;
  sortBy: "name" | "createdAt" | "code";
  sortOrder: "asc" | "desc";
  query: string;
  universityId?: string;
}): Promise<ListResponse> {
  const qs = buildQuery(args);
  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/majors?${qs}`, {
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
  const base = await getApiBase();
  const qs = buildQuery({ page: 1, pageSize: 1000, sortBy: "name", sortOrder: "asc" });
  const res = await fetch(`${base}/api/v1/admin/universities?${qs}`, {
    next: { revalidate: 3600, tags: ["universities"] },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as {
    data: Array<{ id: string; name: string; code: string | null }>;
    pagination: PaginationMeta;
  };
  return payload.data.map((u) => ({ id: u.id, name: u.name, code: u.code ?? null }));
}

export async function MajorsTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
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

  const sortBy: "name" | "createdAt" | "code" = (() => {
    const s = searchParams?.sortBy;
    return s === "name" || s === "code" ? s : "createdAt";
  })();
  const sortOrder: "asc" | "desc" = searchParams?.sortOrder === "asc" ? "asc" : "desc";

  // ---- fetch data in parallel ----
  const [universities, { data: majors, pagination }] = await Promise.all([
    fetchUniversitiesForFilter(),
    fetchMajors({
      page: currentPage,
      pageSize: perPage,
      sortBy,
      sortOrder,
      query: searchQuery,
      universityId: selectedUniversityId, // ✅ يرسل الفلتر فعليًا
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <SearchInput placeholder="ابحث عن تخصص..." />
        <div className="flex items-center gap-2">
          <UniversityFilter
            options={universities}
            // ✅ نجعل القيمة مُتحكّم بها دومًا
            value={selectedUniversityId ?? "__all__"}
            placeholder="تصفية حسب الجامعة"
          />
          <SortButton sortBy="name" currentSort={sortBy} sortOrder={sortOrder}>
            الاسم
          </SortButton>
          <SortButton sortBy="code" currentSort={sortBy} sortOrder={sortOrder}>
            الرمز
          </SortButton>
          <SortButton sortBy="createdAt" currentSort={sortBy} sortOrder={sortOrder}>
            التاريخ
          </SortButton>
        </div>
      </div>

      <div className="rounded-md border">
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
                  <Badge variant="outline">{major.degreeType ?? "غير محدد"}</Badge>
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
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}

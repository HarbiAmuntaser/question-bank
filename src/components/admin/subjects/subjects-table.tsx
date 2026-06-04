// src/components/admin/subjects/subjects-table.tsx
import { adminApiFetch } from "@/lib/server/admin-api-fetch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/Pagination";
import { SubjectActions } from "./subject-actions";
import { UniversityFilter } from "../majors/UniversityFilter";
import { MajorFilter } from "./MajorFilter";
import { AdminTableShell } from "@/components/admin/admin-table-shell";

// ------- API rows -------
export interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  creditHours: number | null;
  semester: number | null;
  year: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  major: {
    id: string;
    name: string;
    code: string | null;
    university: { id: string; name: string; code: string | null };
  };
  chaptersCount: number;
}

interface PaginationMeta { page: number; pageSize: number; total: number; totalPages: number }
interface ListResponse { data: SubjectRow[]; pagination: PaginationMeta }

type UniversityOption = { id: string; name: string; code: string | null };
type MajorOption = { id: string; name: string; code: string | null };

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) usp.set(k, String(v)); });
  return usp.toString();
}

async function fetchSubjects(args: {
  page: number; pageSize: number;
  query: string; universityId?: string; majorId?: string;
}): Promise<ListResponse> {
  const qs = buildQuery(args);
  const res = await adminApiFetch(`/api/v1/admin/subjects?${qs}`, {
    next: { revalidate: 3600, tags: ["subjects"] },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const info = body || `status=${res.status}`;
    throw new Error(`فشل تحميل المقررات: ${info}`);
  }
  return (await res.json()) as ListResponse;
}

async function fetchUniversitiesForFilter(): Promise<UniversityOption[]> {
  return [];
}

async function fetchMajorsForFilter(universityId?: string): Promise<MajorOption[]> {
  void universityId;
  return [];
}

export async function SubjectsTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    query?: string;
    universityId?: string;
    majorId?: string;
  };
}) {
  const currentPage = Number(searchParams?.page ?? 1) || 1;
  const perPage = 10;
  const searchQuery = searchParams?.query ?? "";
  const selectedUniversityId = searchParams?.universityId || undefined;
  const selectedMajorId = searchParams?.majorId || undefined;

  const [universities, majors, { data: subjects, pagination }] = await Promise.all([
    fetchUniversitiesForFilter(),
    fetchMajorsForFilter(selectedUniversityId),
    fetchSubjects({
      page: currentPage,
      pageSize: perPage,
      query: searchQuery,
      universityId: selectedUniversityId,
      majorId: selectedMajorId,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="ابحث عن مقرر..." />
        <div className="flex flex-wrap items-center gap-2">
          <UniversityFilter
            options={universities}
            value={selectedUniversityId ?? "__all__"}
            placeholder="تصفية حسب الجامعة"
          />
          <MajorFilter
            options={majors}
            value={selectedMajorId ?? "__all__"}
            placeholder="تصفية حسب التخصص"
            disabled={!selectedUniversityId} // لا تظهر إلا بعد اختيار جامعة
          />
        </div>
      </div>

      <AdminTableShell minWidth="min-w-[920px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المقرر</TableHead>
              <TableHead>التخصص</TableHead>
              <TableHead>الجامعة</TableHead>
              <TableHead>الرمز</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {subject.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{subject.name}</div>
                      {subject.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {subject.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm font-medium">{subject.major.name}</div>
                  <div className="text-xs text-muted-foreground">{subject.major.code ?? ""}</div>
                </TableCell>

                <TableCell>
                  <div className="text-sm">{subject.major.university.name}</div>
                </TableCell>

                <TableCell>
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {subject.code ?? "غير محدد"}
                  </code>
                </TableCell>

                <TableCell>
                  <Badge variant={subject.isActive ? "default" : "secondary"}>
                    {subject.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="text-sm text-muted-foreground arabic-numbers">
                    {new Date(subject.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <SubjectActions subject={subject} />
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

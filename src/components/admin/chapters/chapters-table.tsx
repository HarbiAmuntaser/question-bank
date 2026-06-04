// src/components/admin/chapters/chapters-table.tsx
import { adminApiFetch } from "@/lib/server/admin-api-fetch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/Pagination";
import { ChapterActions } from "./chapter-actions";
import { UniversityFilter } from "./UniversityFilter";
import { MajorFilter } from "./MajorFilter";
import { SubjectFilter } from "./SubjectFilter";
import { AdminTableShell } from "@/components/admin/admin-table-shell";

type UniOpt = { id: string; name: string; code: string | null };
type MajorOpt = { id: string; name: string; code: string | null };
type SubjectOpt = { id: string; name: string; code: string | null };

type ChapterRow = {
  id: string;
  subjectId: string;
  name: string;
  chapterNumber: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  subject: {
    id: string;
    name: string;
    code: string | null;
    major: {
      id: string;
      name: string;
      code: string | null;
      university: { id: string; name: string; code: string | null };
    };
  };
  questionsCount: number;
};

type PaginationMeta = { page: number; pageSize: number; total: number; totalPages: number };
type ListResponse = { data: ChapterRow[]; pagination: PaginationMeta };

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) usp.set(k, String(v));
  });
  return usp.toString();
}

async function fetchChapters(args: {
  page: number;
  pageSize: number;
  query: string;
  universityId?: string;
  majorId?: string;
  subjectId?: string;
}): Promise<ListResponse> {
  const qs = buildQuery(args);
  const res = await adminApiFetch(`/api/v1/admin/chapters?${qs}`, {
    next: { revalidate: 3600, tags: ["chapters"] },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "فشل تحميل الفصول");
  }
  return (await res.json()) as ListResponse;
}

async function fetchUniversities(): Promise<UniOpt[]> {
  // Filters now search lazily via AdminLookupCombobox, so the server table should not prefetch large lists.
  return [];
}

async function fetchMajors(universityId?: string): Promise<MajorOpt[]> {
  void universityId;
  // Cascading filter options are fetched on demand by the client combobox.
  return [];
}

async function fetchSubjects(filters: { universityId?: string; majorId?: string }): Promise<SubjectOpt[]> {
  void filters;
  // Subjects are resolved lazily after the parent major is selected.
  return [];
}

export async function ChaptersTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    query?: string;
    universityId?: string;
    majorId?: string;
    subjectId?: string;
  };
}) {
  const currentPage = Number(searchParams?.page ?? 1) || 1;
  const perPage = 10;
  const searchQuery = searchParams?.query ?? "";

  const selectedUniversityId = searchParams?.universityId || undefined;
  const selectedMajorId = searchParams?.majorId || undefined;
  const selectedSubjectId = searchParams?.subjectId || undefined;

  const [universities, majors, subjects, { data: chapters, pagination }] = await Promise.all([
    fetchUniversities(),
    fetchMajors(selectedUniversityId),
    fetchSubjects({ universityId: selectedUniversityId, majorId: selectedMajorId }),
    fetchChapters({
      page: currentPage,
      pageSize: perPage,
      query: searchQuery,
      universityId: selectedUniversityId,
      majorId: selectedMajorId,
      subjectId: selectedSubjectId,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput placeholder="ابحث عن فصل أو مقرر أو تخصص..." />
        <div className="flex flex-wrap items-center gap-2">
          <UniversityFilter
            options={universities}
            value={selectedUniversityId ?? "__all__"}
            placeholder="الجامعة"
          />
          <MajorFilter
            options={majors}
            value={selectedMajorId ?? "__all__"}
            placeholder="التخصص"
            disabled={!selectedUniversityId}
          />
          <SubjectFilter
            options={subjects}
            value={selectedSubjectId ?? "__all__"}
            placeholder="المقرر"
            disabled={!selectedMajorId}
          />
        </div>
      </div>

      <AdminTableShell minWidth="min-w-[1120px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الفصل</TableHead>
              <TableHead>المقرر</TableHead>
              <TableHead>التخصص</TableHead>
              <TableHead>الجامعة</TableHead>
              <TableHead>رقم الفصل</TableHead>
              <TableHead>عدد الأسئلة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chapters.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 text-purple-600">{c.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{c.subject.name}</div>
                  <div className="text-xs text-muted-foreground">{c.subject.code ?? ""}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{c.subject.major.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{c.subject.major.university.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm arabic-numbers">{c.chapterNumber ?? "غير محدد"}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm arabic-numbers">{c.questionsCount}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground arabic-numbers">
                    {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <ChapterActions chapter={c as any} />
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

// src/components/admin/chapters/chapters-table.tsx
import { getRequestOrigin } from "@/lib/server/request-origin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { SortButton } from "@/components/ui/SortButton";
import { Pagination } from "@/components/Pagination";
import { ChapterActions } from "./chapter-actions";
import { UniversityFilter } from "./UniversityFilter";
import { MajorFilter } from "./MajorFilter";
import { SubjectFilter } from "./SubjectFilter";

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

async function getApiBase(): Promise<string> {
  return getRequestOrigin();
}

async function fetchChapters(args: {
  page: number;
  pageSize: number;
  sortBy: "name" | "createdAt" | "chapterNumber";
  sortOrder: "asc" | "desc";
  query: string;
  universityId?: string;
  majorId?: string;
  subjectId?: string;
}): Promise<ListResponse> {
  const qs = buildQuery(args);
  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/admin/chapters?${qs}`, {
    next: { revalidate: 3600, tags: ["chapters"] },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "فشل تحميل الفصول");
  }
  return (await res.json()) as ListResponse;
}

async function fetchUniversities(): Promise<UniOpt[]> {
  const base = await getApiBase();
  const qs = buildQuery({ page: 1, pageSize: 1000, sortBy: "name", sortOrder: "asc" });
  const res = await fetch(`${base}/api/v1/admin/universities?${qs}`, {
    next: { revalidate: 3600, tags: ["universities"] },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as { data: Array<{ id: string; name: string; code: string | null }> };
  return payload.data.map((u) => ({ id: u.id, name: u.name, code: u.code ?? null }));
}

async function fetchMajors(universityId?: string): Promise<MajorOpt[]> {
  const base = await getApiBase();
  const qs = buildQuery({
    page: 1,
    pageSize: 1000,
    sortBy: "name",
    sortOrder: "asc",
    universityId,
  });
  const res = await fetch(`${base}/api/v1/admin/majors?${qs}`, {
    next: { revalidate: 3600, tags: ["majors"] },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as { data: Array<{ id: string; name: string; code: string | null }> };
  // API يعيد حقول إضافية، لا نحتاج سوى id,name,code
  return payload.data.map((m) => ({ id: m.id, name: m.name, code: m.code ?? null }));
}

async function fetchSubjects(filters: { universityId?: string; majorId?: string }): Promise<SubjectOpt[]> {
  const base = await getApiBase();
  const qs = buildQuery({
    page: 1,
    pageSize: 1000,
    sortBy: "name",
    sortOrder: "asc",
    universityId: filters.universityId,
    majorId: filters.majorId,
  });
  const res = await fetch(`${base}/api/v1/admin/subjects?${qs}`, {
    next: { revalidate: 3600, tags: ["subjects"] },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as { data: Array<{ id: string; name: string; code: string | null }> };
  return payload.data.map((s) => ({ id: s.id, name: s.name, code: s.code ?? null }));
}

export async function ChaptersTable({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    query?: string;
    sortBy?: string;
    sortOrder?: string;
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

  const sortBy: "name" | "createdAt" | "chapterNumber" = (() => {
    const s = searchParams?.sortBy;
    return s === "name" || s === "chapterNumber" ? s : "createdAt";
  })();
  const sortOrder: "asc" | "desc" = searchParams?.sortOrder === "asc" ? "asc" : "desc";

  const [universities, majors, subjects, { data: chapters, pagination }] = await Promise.all([
    fetchUniversities(),
    fetchMajors(selectedUniversityId),
    fetchSubjects({ universityId: selectedUniversityId, majorId: selectedMajorId }),
    fetchChapters({
      page: currentPage,
      pageSize: perPage,
      sortBy,
      sortOrder,
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
        <div className="flex items-center gap-2">
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
          <SortButton sortBy="name" currentSort={sortBy} sortOrder={sortOrder}>الاسم</SortButton>
          <SortButton sortBy="chapterNumber" currentSort={sortBy} sortOrder={sortOrder}>رقم الفصل</SortButton>
          <SortButton sortBy="createdAt" currentSort={sortBy} sortOrder={sortOrder}>التاريخ</SortButton>
        </div>
      </div>

      <div className="rounded-md border">
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

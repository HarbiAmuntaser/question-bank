import { Pagination } from "@/components/Pagination";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { UniversityFilter } from "@/components/admin/majors/UniversityFilter";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApiFetch } from "@/lib/server/admin-api-fetch";
import { CollegeActions } from "./college-actions";

type CollegeRow = {
  id: string;
  universityId: string;
  name: string;
  slug: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  university: { id: string; name: string; code: string | null };
  majorsCount: number;
};

type ListResponse = {
  data: CollegeRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function CollegesTable({
  searchParams,
}: {
  searchParams: { page?: string; query?: string; universityId?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const query = searchParams.query ?? "";
  const universityId = searchParams.universityId || undefined;
  const params = new URLSearchParams({ page: String(page), pageSize: "10", query });
  if (universityId) params.set("universityId", universityId);

  const response = await adminApiFetch(`/api/v1/admin/colleges?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error("failed_to_load_colleges");
  const { data, pagination } = (await response.json()) as ListResponse;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="ابحث عن كلية..." />
        <UniversityFilter
          value={universityId ?? "__all__"}
          placeholder="تصفية حسب الجامعة"
        />
      </div>
      <AdminTableShell minWidth="min-w-[860px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكلية</TableHead>
              <TableHead>الجامعة</TableHead>
              <TableHead>الرمز</TableHead>
              <TableHead>التخصصات المرتبطة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? data.map((college) => (
              <TableRow key={college.id}>
                <TableCell>
                  <div className="font-medium">{college.name}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">{college.slug}</div>
                </TableCell>
                <TableCell>
                  <div>{college.university.name}</div>
                  <div className="text-xs text-muted-foreground">{college.university.code ?? ""}</div>
                </TableCell>
                <TableCell>{college.code ?? "غير محدد"}</TableCell>
                <TableCell className="arabic-numbers">{college.majorsCount}</TableCell>
                <TableCell>
                  <Badge variant={college.isActive ? "default" : "secondary"}>
                    {college.isActive ? "نشطة" : "غير نشطة"}
                  </Badge>
                </TableCell>
                <TableCell className="arabic-numbers text-muted-foreground">
                  {new Date(college.createdAt).toLocaleDateString("ar-SA")}
                </TableCell>
                <TableCell className="text-left">
                  <CollegeActions college={college} />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  لا توجد كليات مطابقة.
                </TableCell>
              </TableRow>
            )}
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

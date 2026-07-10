import { FileText, Plus } from "lucide-react";

import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/server/admin-api-fetch";

import { SummariesFilters } from "./summaries-filters";
import { SummariesPagination } from "./summaries-pagination";
import { SummaryActions } from "./summary-actions";
import { SummaryDialog } from "./summary-dialog";
import type { StudySummaryAccessType, StudySummaryListResponse, StudySummaryRow, StudySummaryStatus } from "./types";

export type SummariesSearchParams = {
  page?: string;
  query?: string;
  status?: string;
  universityId?: string;
  majorId?: string;
  subjectId?: string;
  chapterId?: string;
  sortBy?: string;
  sortOrder?: string;
};

const statusLabels: Record<StudySummaryStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  archived: "مؤرشف",
};

const accessTypeLabels: Record<StudySummaryAccessType, string> = {
  inherit: "يرث من المادة",
  free: "مجاني",
  paid: "مدفوع",
};

const accessTypeClasses: Record<StudySummaryAccessType, string> = {
  inherit: "border-border bg-muted text-muted-foreground",
  free: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  paid: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
};

function readParam(searchParams: SummariesSearchParams | undefined, key: keyof SummariesSearchParams) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value : undefined;
}

function buildQuery(searchParams?: SummariesSearchParams) {
  const params = new URLSearchParams();
  const page = readParam(searchParams, "page");
  const query = readParam(searchParams, "query");
  const status = readParam(searchParams, "status");
  const subjectId = readParam(searchParams, "subjectId");
  const chapterId = readParam(searchParams, "chapterId");
  const sortBy = readParam(searchParams, "sortBy");
  const sortOrder = readParam(searchParams, "sortOrder");

  params.set("page", page ?? "1");
  params.set("pageSize", "10");
  if (query?.trim()) params.set("query", query.trim());
  if (status === "draft" || status === "published" || status === "archived") params.set("status", status);
  if (subjectId) params.set("subjectId", subjectId);
  if (chapterId) params.set("chapterId", chapterId);
  params.set("sortBy", ["createdAt", "updatedAt", "publishedAt", "title", "sortOrder"].includes(sortBy ?? "") ? sortBy! : "updatedAt");
  params.set("sortOrder", sortOrder === "asc" ? "asc" : "desc");

  return params.toString();
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function yesNo(value: boolean) {
  return value ? "نعم" : "لا";
}

async function fetchSummaries(searchParams?: SummariesSearchParams) {
  const qs = buildQuery(searchParams);
  const res = await adminApiFetch(`/api/v1/admin/summaries?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "failed_to_load_study_summaries");
  }
  return (await res.json()) as StudySummaryListResponse;
}

function SummariesErrorState() {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">الملخصات الدراسية</h2>
        <p className="text-sm text-muted-foreground">إدارة ملخصات المواد وربطها بالفصول الاختيارية.</p>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
        تعذر تحميل الملخصات مؤقتًا. حاول تحديث الصفحة.
      </div>
    </section>
  );
}

export async function SummariesTable({ searchParams }: { searchParams?: SummariesSearchParams }) {
  const payload = await fetchSummaries(searchParams).catch(() => null);
  if (!payload) return <SummariesErrorState />;

  const { data: summaries, pagination } = payload;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">الملخصات الدراسية</h2>
          <p className="text-sm text-muted-foreground">
            أنشئ ملخصات اختيارية مرتبطة بالمواد، مع فصل اختياري وملف PDF اختياري. الواجهة العامة ستأتي في مرحلة لاحقة.
          </p>
        </div>
        <SummaryDialog>
          <Button className="h-10 gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            إضافة ملخص
          </Button>
        </SummaryDialog>
      </div>

      <SummariesFilters />

      <AdminTableShell minWidth="min-w-[1400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>المادة</TableHead>
              <TableHead>الفصل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>سياسة الوصول</TableHead>
              <TableHead>HTML/Text</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead>النشر</TableHead>
              <TableHead>القراءة</TableHead>
              <TableHead>مميز</TableHead>
              <TableHead>الترتيب</TableHead>
              <TableHead>آخر تحديث</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.length ? (
              summaries.map((summary: StudySummaryRow) => {
                const hasTextContent = Boolean(summary.contentHtml?.trim() || summary.contentText?.trim());
                const hasPdf = Boolean(summary.pdfAttachmentId);

                return (
                  <TableRow key={summary.id}>
                    <TableCell className="max-w-[260px]">
                      <div className="space-y-1">
                        <div className="line-clamp-2 font-medium">{summary.title}</div>
                        {summary.excerpt ? (
                          <div className="line-clamp-1 text-xs text-muted-foreground">{summary.excerpt}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code dir="ltr" className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {summary.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">{summary.subject.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {summary.subject.major.name} - {summary.subject.major.university.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {summary.chapter ? (
                        <div className="space-y-1">
                          <div>{summary.chapter.name}</div>
                          {typeof summary.chapter.chapterNumber === "number" ? (
                            <div className="text-xs arabic-numbers">الفصل {summary.chapter.chapterNumber}</div>
                          ) : null}
                        </div>
                      ) : (
                        "غير محدد"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={summary.status === "published" ? "default" : summary.status === "archived" ? "secondary" : "outline"}>
                        {statusLabels[summary.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={accessTypeClasses[summary.accessType]}>
                        {accessTypeLabels[summary.accessType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={hasTextContent ? "default" : "secondary"}>{yesNo(hasTextContent)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={hasPdf ? "default" : "secondary"} className="gap-1">
                        {hasPdf ? <FileText className="h-3.5 w-3.5" aria-hidden /> : null}
                        {yesNo(hasPdf)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground arabic-numbers">
                      {formatDate(summary.publishedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground arabic-numbers">
                      {summary.readingMinutes ? `${summary.readingMinutes} د` : "غير محدد"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={summary.isFeatured ? "default" : "secondary"}>{summary.isFeatured ? "نعم" : "لا"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm arabic-numbers">{summary.sortOrder}</TableCell>
                    <TableCell className="text-sm text-muted-foreground arabic-numbers">
                      {formatDate(summary.updatedAt)}
                    </TableCell>
                    <TableCell className="text-left">
                      <SummaryActions summary={summary} />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={14} className="h-28 text-center text-sm text-muted-foreground">
                  لا توجد ملخصات حتى الآن.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      <SummariesPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
      />
    </section>
  );
}

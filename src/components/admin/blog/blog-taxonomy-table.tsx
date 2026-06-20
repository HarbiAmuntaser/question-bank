import { Plus } from "lucide-react";

import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/server/admin-api-fetch";

import { BlogPagination } from "./blog-pagination";
import { BlogTaxonomyActions } from "./blog-taxonomy-actions";
import { BlogTaxonomyDialog } from "./blog-taxonomy-dialog";
import { BlogTaxonomyFilters } from "./blog-taxonomy-filters";
import type { BlogTaxonomyKind, BlogTaxonomyListResponse } from "./types";

type BlogSearchParams = {
  topicPage?: string;
  topicQuery?: string;
  topicStatus?: string;
  tagPage?: string;
  tagQuery?: string;
  tagStatus?: string;
};

const tableMeta = {
  topic: {
    title: "مواضيع المدونة",
    description: "تصنيفات رئيسية ستُستخدم لاحقًا لتنظيم المقالات التعليمية.",
    addLabel: "إضافة موضوع",
    searchPlaceholder: "ابحث باسم الموضوع أو slug...",
    endpoint: "/api/v1/admin/blog/topics",
    empty: "لا توجد مواضيع حتى الآن.",
  },
  tag: {
    title: "وسوم المدونة",
    description: "وسوم خفيفة تساعد لاحقًا في ربط المقالات ورفع قابلية الاكتشاف.",
    addLabel: "إضافة وسم",
    searchPlaceholder: "ابحث باسم الوسم أو slug...",
    endpoint: "/api/v1/admin/blog/tags",
    empty: "لا توجد وسوم حتى الآن.",
  },
} as const;

const BLOG_LOAD_ERROR = "تعذر تحميل بيانات المدونة مؤقتًا. حاول تحديث الصفحة.";

function readParam(searchParams: BlogSearchParams | undefined, key: keyof BlogSearchParams) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value : undefined;
}

function buildQuery(kind: BlogTaxonomyKind, searchParams?: BlogSearchParams) {
  const params = new URLSearchParams();
  const page = readParam(searchParams, `${kind}Page` as keyof BlogSearchParams);
  const query = readParam(searchParams, `${kind}Query` as keyof BlogSearchParams);
  const status = readParam(searchParams, `${kind}Status` as keyof BlogSearchParams);

  params.set("page", page ?? "1");
  params.set("pageSize", "10");
  if (query?.trim()) params.set("query", query.trim());
  if (status === "active" || status === "inactive") params.set("status", status);
  params.set("sortBy", "createdAt");
  params.set("sortOrder", "desc");

  return params.toString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function fetchTaxonomy(kind: BlogTaxonomyKind, searchParams?: BlogSearchParams) {
  const meta = tableMeta[kind];
  const qs = buildQuery(kind, searchParams);
  const res = await adminApiFetch(`${meta.endpoint}?${qs}`, { cache: "no-store" });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `فشل تحميل ${meta.title}`);
  }

  return (await res.json()) as BlogTaxonomyListResponse;
}

function BlogTaxonomyErrorState({
  kind,
  title,
  description,
  placeholder,
}: {
  kind: BlogTaxonomyKind;
  title: string;
  description: string;
  placeholder: string;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <BlogTaxonomyFilters kind={kind} placeholder={placeholder} />

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
        {BLOG_LOAD_ERROR}
      </div>
    </section>
  );
}

export async function BlogTaxonomyTable({
  kind,
  searchParams,
}: {
  kind: BlogTaxonomyKind;
  searchParams?: BlogSearchParams;
}) {
  const meta = tableMeta[kind];
  const result = await fetchTaxonomy(kind, searchParams).catch(() => null);
  if (!result) {
    return (
      <BlogTaxonomyErrorState
        kind={kind}
        title={meta.title}
        description={meta.description}
        placeholder={meta.searchPlaceholder}
      />
    );
  }

  const { data, pagination } = result;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{meta.title}</h2>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <BlogTaxonomyDialog kind={kind}>
          <Button className="h-10 w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden />
            {meta.addLabel}
          </Button>
        </BlogTaxonomyDialog>
      </div>

      <BlogTaxonomyFilters kind={kind} placeholder={meta.searchPlaceholder} />

      <AdminTableShell minWidth="min-w-[860px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>المقالات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <code dir="ltr" className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {item.slug}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                    <span className="line-clamp-2">{item.description || "لا يوجد وصف"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="arabic-numbers text-sm">{item.postsCount}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground arabic-numbers">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell className="text-left">
                    <BlogTaxonomyActions kind={kind} item={item} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">
                  {meta.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      <BlogPagination
        kind={kind}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
      />
    </section>
  );
}

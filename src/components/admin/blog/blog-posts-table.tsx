import Link from "next/link";
import { FileText, Plus, Tags } from "lucide-react";

import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/server/admin-api-fetch";

import { BlogPagination } from "./blog-pagination";
import { BlogPostActions } from "./blog-post-actions";
import { BlogPostDialog } from "./blog-post-dialog";
import { BlogPostsFilters } from "./blog-posts-filters";
import type {
  BlogPostListResponse,
  BlogPostRow,
  BlogPostStatus,
  BlogPostTagOption,
  BlogPostTopicOption,
  BlogTaxonomyListResponse,
  BlogVisibility,
} from "./types";

type BlogPostsSearchParams = {
  postPage?: string;
  postQuery?: string;
  postStatus?: string;
};

const statusLabels: Record<BlogPostStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  archived: "مؤرشف",
};

const visibilityLabels: Record<BlogVisibility, string> = {
  global: "عام",
  countries: "دول محددة",
};

const BLOG_LOAD_ERROR = "تعذر تحميل بيانات المدونة مؤقتًا. حاول تحديث الصفحة.";

function readParam(searchParams: BlogPostsSearchParams | undefined, key: keyof BlogPostsSearchParams) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value : undefined;
}

function buildQuery(searchParams?: BlogPostsSearchParams) {
  const params = new URLSearchParams();
  const page = readParam(searchParams, "postPage");
  const query = readParam(searchParams, "postQuery");
  const status = readParam(searchParams, "postStatus");

  params.set("page", page ?? "1");
  params.set("pageSize", "10");
  if (query?.trim()) params.set("query", query.trim());
  if (status === "draft" || status === "published" || status === "archived") params.set("status", status);
  params.set("sortBy", "updatedAt");
  params.set("sortOrder", "desc");

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

async function fetchPosts(searchParams?: BlogPostsSearchParams) {
  const qs = buildQuery(searchParams);
  const res = await adminApiFetch(`/api/v1/admin/blog/posts?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "فشل تحميل المقالات");
  }
  return (await res.json()) as BlogPostListResponse;
}

async function fetchTopics() {
  const res = await adminApiFetch("/api/v1/admin/blog/topics?page=1&pageSize=100&status=active&sortBy=name&sortOrder=asc", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("failed_to_load_blog_topics");
  const payload = (await res.json()) as BlogTaxonomyListResponse;
  return payload.data.map((topic) => ({ id: topic.id, name: topic.name, slug: topic.slug })) satisfies BlogPostTopicOption[];
}

async function fetchTags() {
  const res = await adminApiFetch("/api/v1/admin/blog/tags?page=1&pageSize=100&status=active&sortBy=name&sortOrder=asc", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("failed_to_load_blog_tags");
  const payload = (await res.json()) as BlogTaxonomyListResponse;
  return payload.data.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug })) satisfies BlogPostTagOption[];
}

function BlogPostsErrorState() {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">المقالات</h2>
        <p className="text-sm text-muted-foreground">إدارة مسودات ومقالات المدونة.</p>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
        {BLOG_LOAD_ERROR}
      </div>
    </section>
  );
}

export async function BlogPostsTable({ searchParams }: { searchParams?: BlogPostsSearchParams }) {
  const result = await Promise.all([fetchPosts(searchParams), fetchTopics(), fetchTags()]).catch(() => null);
  if (!result) return <BlogPostsErrorState />;

  const [{ data: posts, pagination }, topics, tags] = result;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">المقالات</h2>
          <p className="text-sm text-muted-foreground">
            إدارة مسودات ومقالات المدونة. الواجهة العامة وSEO التفصيلي ستأتي في مراحل لاحقة.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="h-10 gap-2">
            <Link href="/admin/blog/topics">
              <FileText className="h-4 w-4" aria-hidden />
              المواضيع
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 gap-2">
            <Link href="/admin/blog/tags">
              <Tags className="h-4 w-4" aria-hidden />
              الوسوم
            </Link>
          </Button>
          <BlogPostDialog topics={topics} tags={tags}>
            <Button className="h-10 gap-2" disabled={topics.length === 0}>
              <Plus className="h-4 w-4" aria-hidden />
              إضافة مقال
            </Button>
          </BlogPostDialog>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          يجب إنشاء موضوع واحد نشط على الأقل قبل إضافة المقالات.
        </div>
      ) : null}

      <BlogPostsFilters />

      <AdminTableShell minWidth="min-w-[1100px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العنوان</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الموضوع</TableHead>
              <TableHead>الظهور</TableHead>
              <TableHead>النشر</TableHead>
              <TableHead>آخر تحديث</TableHead>
              <TableHead>مميز</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length ? (
              posts.map((post: BlogPostRow) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-[260px]">
                    <div className="space-y-1">
                      <div className="line-clamp-2 font-medium">{post.title}</div>
                      {post.excerpt ? <div className="line-clamp-1 text-xs text-muted-foreground">{post.excerpt}</div> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code dir="ltr" className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {post.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === "published" ? "default" : post.status === "archived" ? "secondary" : "outline"}>
                      {statusLabels[post.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{post.primaryTopic.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline">{visibilityLabels[post.visibility]}</Badge>
                      {post.visibility === "countries" ? (
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {post.countries.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground arabic-numbers">
                    {formatDate(post.publishedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground arabic-numbers">
                    {formatDate(post.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.featured ? "default" : "secondary"}>{post.featured ? "نعم" : "لا"}</Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <BlogPostActions post={post} topics={topics} tags={tags} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-28 text-center text-sm text-muted-foreground">
                  لا توجد مقالات حتى الآن.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      <BlogPagination
        kind="post"
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
      />
    </section>
  );
}

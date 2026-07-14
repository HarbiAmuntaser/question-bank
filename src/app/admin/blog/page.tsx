import { Suspense } from "react";
import type { Metadata } from "next";

import { BlogPostsTable } from "@/components/admin/blog/blog-posts-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export const metadata: Metadata = {
  title: "مقالات المدونة",
};

type BlogPostsSearchParams = {
  postPage?: string;
  postQuery?: string;
  postStatus?: string;
};

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogPostsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">مقالات المدونة</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          إدارة المقالات التعليمية لمنصة مستواك. الواجهة العامة، SEO التفصيلي، وsitemap ستأتي في مراحل لاحقة.
        </p>
      </div>

      <Suspense
        fallback={<TableSkeleton columns={9} rows={8} />}
        key={`${resolvedSearchParams.postPage ?? "1"}-${resolvedSearchParams.postQuery ?? ""}-${resolvedSearchParams.postStatus ?? "all"}`}
      >
        <BlogPostsTable searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

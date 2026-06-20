import { Suspense } from "react";
import type { Metadata } from "next";

import { BlogTaxonomyTable } from "@/components/admin/blog/blog-taxonomy-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export const metadata: Metadata = {
  title: "وسوم المدونة | مستواك",
};

type BlogTagsSearchParams = {
  tagPage?: string;
  tagQuery?: string;
  tagStatus?: string;
};

export default async function AdminBlogTagsPage({
  searchParams,
}: {
  searchParams: Promise<BlogTagsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">وسوم المدونة</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          إدارة الوسوم التي ستساعد لاحقًا في تنظيم المقالات وربطها بالمحتوى التعليمي.
        </p>
      </div>

      <Suspense
        fallback={<TableSkeleton columns={7} rows={5} />}
        key={`${resolvedSearchParams.tagPage ?? "1"}-${resolvedSearchParams.tagQuery ?? ""}-${resolvedSearchParams.tagStatus ?? "all"}`}
      >
        <BlogTaxonomyTable kind="tag" searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

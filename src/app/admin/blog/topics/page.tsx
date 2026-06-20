import { Suspense } from "react";
import type { Metadata } from "next";

import { BlogTaxonomyTable } from "@/components/admin/blog/blog-taxonomy-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export const metadata: Metadata = {
  title: "مواضيع المدونة | مستواك",
};

type BlogTopicsSearchParams = {
  topicPage?: string;
  topicQuery?: string;
  topicStatus?: string;
};

export default async function AdminBlogTopicsPage({
  searchParams,
}: {
  searchParams: Promise<BlogTopicsSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">مواضيع المدونة</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          إدارة التصنيفات الرئيسية التي ستنظم مقالات المدونة لاحقًا.
        </p>
      </div>

      <Suspense
        fallback={<TableSkeleton columns={7} rows={5} />}
        key={`${resolvedSearchParams.topicPage ?? "1"}-${resolvedSearchParams.topicQuery ?? ""}-${resolvedSearchParams.topicStatus ?? "all"}`}
      >
        <BlogTaxonomyTable kind="topic" searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

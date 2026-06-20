import type { Metadata } from "next";
import { BookOpenText } from "lucide-react";
import { notFound } from "next/navigation";

import { BlogPostCard } from "@/components/public/blog/blog-post-card";
import { FeaturedPosts } from "@/components/public/blog/featured-posts";
import { PublicBlogPagination } from "@/components/public/blog/blog-pagination";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header/public-header";
import { SUPPORTED_COUNTRIES } from "@/config/regions";
import { getPublicBlogPage, parseBlogCountry } from "@/lib/server/blog";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

type PageParams = { cc: string };
type PageSearchParams = { page?: string };

const BLOG_TITLE = "مدونة مستواك | نصائح ومقالات تعليمية";
const BLOG_DESCRIPTION = "مقالات تعليمية ونصائح عملية للمذاكرة والاستعداد للاختبارات من منصة مستواك.";

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { cc: rawCc } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) return {};

  const canonical = `${SITE_URL}/${cc}/blog`;
  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      locale: "ar",
    },
  };
}

export default async function PublicBlogPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ cc: rawCc }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const cc = parseBlogCountry(rawCc);
  if (!cc) notFound();

  const requestedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const blog = await getPublicBlogPage(cc, requestedPage);
  const hasContent = blog.featured.length > 0 || blog.posts.length > 0;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader />

      <main>
        <section className="border-b bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpenText className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">مدونة مستواك</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              مقالات تعليمية ونصائح للمذاكرة والاستعداد للاختبارات، مكتوبة لتساعدك على التعلم بطريقة أوضح وأكثر تنظيمًا.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {hasContent ? (
            <>
              <FeaturedPosts posts={blog.featured} cc={cc} />

              <section className="space-y-6" aria-labelledby="latest-blog-heading">
                <div className="space-y-2">
                  <h2 id="latest-blog-heading" className="text-2xl font-bold tracking-tight">أحدث المقالات</h2>
                  <p className="text-sm leading-7 text-muted-foreground">تصفح المقالات المتاحة لطلاب {SUPPORTED_COUNTRIES[cc].label}.</p>
                </div>

                {blog.posts.length ? (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {blog.posts.map((post, index) => (
                      <BlogPostCard key={post.id} post={post} cc={cc} eager={blog.featured.length === 0 && index === 0} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
                    لا توجد مقالات إضافية في هذه الصفحة.
                  </p>
                )}
              </section>

              <PublicBlogPagination cc={cc} page={blog.pagination.page} totalPages={blog.pagination.totalPages} />
            </>
          ) : (
            <section className="mx-auto max-w-2xl rounded-lg border bg-card p-8 text-center shadow-sm">
              <BookOpenText className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">لا توجد مقالات منشورة حاليًا</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                ستظهر هنا المقالات التعليمية الجديدة بعد نشرها واعتماد موعد ظهورها.
              </p>
            </section>
          )}
        </div>
      </main>

      <PublicFooter cc={cc} />
    </div>
  );
}

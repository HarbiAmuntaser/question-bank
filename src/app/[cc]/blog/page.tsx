import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Tags } from "lucide-react";
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

const BLOG_TITLE = "مدونة مستواك | مقالات تعليمية وتدريبية";
const BLOG_METADATA_TITLE = "المدونة | مقالات تعليمية وتدريبية";
const BLOG_DESCRIPTION =
  "محتوى تعليمي وتدريبي يساعدك على تطوير معرفتك، فهم المسارات الأكاديمية والمهنية، والاستعداد للتعلم والاختبارات بطريقة أوضح.";

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { cc: rawCc } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) return {};

  const canonical = `${SITE_URL}/${cc}/blog`;
  return {
    title: BLOG_METADATA_TITLE,
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

function BlogTopicsPreview({
  cc,
  topics,
}: {
  cc: string;
  topics?: Array<{ id: string; name: string; slug: string; description: string | null }>;
}) {
  const safeTopics = Array.isArray(topics) ? topics : [];
  if (!safeTopics.length) return null;

  return (
    <section className="space-y-3" aria-labelledby="blog-topics-heading">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
            <Tags className="h-4 w-4" aria-hidden />
          </span>
          <h2 id="blog-topics-heading" className="text-base font-bold tracking-tight sm:text-lg">
            استكشف حسب المجال
          </h2>
        </div>
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          اسحب لعرض المزيد
        </span>
      </div>

      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto overscroll-x-contain rounded-lg border bg-card/80 p-2 shadow-sm [scrollbar-width:thin] md:p-3"
          aria-label="مجالات المدونة"
        >
          {safeTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/${cc}/blog/topics/${encodeURIComponent(topic.slug)}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-primary/20 bg-background px-3.5 py-2 text-sm font-semibold text-foreground/85 transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={topic.description ?? undefined}
            >
              {topic.name}
            </Link>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-lg bg-gradient-to-r from-background to-transparent" aria-hidden />
      </div>
    </section>
  );
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

      <main id="main-content" tabIndex={-1}>
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpenText className="h-6 w-6" aria-hidden />
            </div>
            <p className="mb-3 text-sm font-semibold text-primary">محتوى تعليمي وتدريبي</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">مدونة مستواك</h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              مقالات ورؤى تساعدك على تطوير معرفتك، فهم المسارات الأكاديمية والمهنية، واختيار المحتوى التعليمي أو التدريبي المناسب لك بثقة.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {hasContent ? (
            <>
              <BlogTopicsPreview cc={cc} topics={blog.topics} />

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

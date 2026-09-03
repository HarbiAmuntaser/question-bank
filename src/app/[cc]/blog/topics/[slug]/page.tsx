import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { notFound } from "next/navigation";

import { BlogPostCard } from "@/components/public/blog/blog-post-card";
import { PublicBlogPagination } from "@/components/public/blog/blog-pagination";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header/public-header";
import { buttonVariants } from "@/components/ui/button";
import { getPublicBlogTopicPage, parseBlogCountry, prepareSeoSchemaJson } from "@/lib/server/blog";
import { SITE_NAME, SITE_URL, stripSiteNameFromTitle, withSiteName } from "@/lib/seo";
import { blogTopicRobots } from "@/lib/search-indexing";
import { cn } from "@/lib/utils";

type PageParams = { cc: string; slug: string };
type PageSearchParams = { page?: string };

function topicDescription(topicName: string) {
  return `اقرأ مقالات مستواك حول ${topicName} ونصائح تساعد الطلاب على الاستعداد للاختبارات وتحسين مستواهم الدراسي.`;
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { cc: rawCc, slug } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) return {};

  const topicPage = await getPublicBlogTopicPage(cc, slug, 1);
  if (!topicPage) return {};

  const { topic } = topicPage;
  const seo = topic.seo;
  const canonical = seo?.canonicalUrl || `${SITE_URL}/${cc}/blog/topics/${encodeURIComponent(topic.slug)}`;
  const title = stripSiteNameFromTitle(seo?.metaTitle) || `${topic.name} | المدونة`;
  const description = seo?.metaDescription || topic.description || topicDescription(topic.name);
  const ogTitle = seo?.ogTitle || withSiteName(title);
  const ogDescription = seo?.ogDescription || description;

  return {
    title,
    description,
    alternates: { canonical },
    robots: blogTopicRobots(topicPage.pagination.total, seo),
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      locale: "ar",
      images: seo?.ogImageUrl ? [{ url: seo.ogImageUrl, alt: title }] : undefined,
    },
  };
}

export default async function PublicBlogTopicPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ cc: rawCc, slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const cc = parseBlogCountry(rawCc);
  if (!cc) notFound();

  const requestedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const topicPage = await getPublicBlogTopicPage(cc, slug, requestedPage);
  if (!topicPage) notFound();

  const { topic, posts, pagination } = topicPage;
  const basePath = `/${cc}/blog/topics/${encodeURIComponent(topic.slug)}`;
  const description = topic.description || topicDescription(topic.name);
  const schemaJson = prepareSeoSchemaJson(topic.seo?.schemaJson);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader />

      <main id="main-content" tabIndex={-1}>
        {schemaJson ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: schemaJson }}
          />
        ) : null}
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <Link
              href={`/${cc}/blog`}
              className={cn(buttonVariants({ variant: "ghost" }), "mb-6 h-10 gap-2 px-0 text-primary hover:bg-transparent hover:text-primary/80")}
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              العودة إلى المدونة
            </Link>

            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">
                <Tags className="h-4 w-4" aria-hidden />
                موضوع في المدونة
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{topic.name}</h1>
              <p className="text-base leading-8 text-muted-foreground sm:text-lg">{description}</p>
              <p className="text-sm text-muted-foreground">
                {pagination.total} مقال منشور ضمن هذا الموضوع.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <section className="space-y-6" aria-labelledby="topic-posts-heading">
            <div className="space-y-2">
              <h2 id="topic-posts-heading" className="text-2xl font-bold tracking-tight">
                مقالات {topic.name}
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                مجموعة المقالات المرتبطة بهذا الموضوع، مرتبة بحسب التمييز وتاريخ النشر.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => (
                <BlogPostCard key={post.id} post={post} cc={cc} eager={index === 0} />
              ))}
            </div>
          </section>

          <PublicBlogPagination cc={cc} page={pagination.page} totalPages={pagination.totalPages} basePath={basePath} />
        </div>
      </main>

      <PublicFooter cc={cc} />
    </div>
  );
}

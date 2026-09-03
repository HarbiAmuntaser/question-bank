import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogArticle } from "@/components/public/blog/blog-article";
import { BlogPostCard } from "@/components/public/blog/blog-post-card";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header/public-header";
import { getPublicBlogPost, getRelatedBlogPosts, parseBlogCountry, prepareSeoSchemaJson } from "@/lib/server/blog";
import { SITE_NAME, SITE_URL, stripSiteNameFromTitle } from "@/lib/seo";

type PageParams = { cc: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { cc: rawCc, slug } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) return {};

  const post = await getPublicBlogPost(cc, slug);
  if (!post) return {};

  const seo = post.seo;
  const canonical = seo?.canonicalUrl || `${SITE_URL}/${cc}/blog/${encodeURIComponent(post.slug)}`;
  const title = stripSiteNameFromTitle(seo?.metaTitle) || post.title;
  const description = seo?.metaDescription || post.excerpt || post.contentText?.slice(0, 160) || `مقال تعليمي من ${SITE_NAME}`;
  const ogTitle = seo?.ogTitle || title;
  const ogDescription = seo?.ogDescription || description;
  const shareImageUrl = seo?.ogImageUrl?.trim() || post.coverAttachment?.url?.trim() || `${SITE_URL}/brand/mustawak-og.png`;
  const shareImageAlt = post.coverAttachment?.title || post.title;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: !seo?.noindex,
      follow: !seo?.nofollow,
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      publishedTime: post.publishedAt,
      locale: "ar",
      images: [{ url: shareImageUrl, alt: shareImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [shareImageUrl],
    },
  };
}

export default async function PublicBlogPostPage({ params }: { params: Promise<PageParams> }) {
  const { cc: rawCc, slug } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) notFound();

  const post = await getPublicBlogPost(cc, slug);
  if (!post) notFound();
  const schemaJson = prepareSeoSchemaJson(post.seo?.schemaJson);

  const relatedPosts = await getRelatedBlogPosts({
    currentPostId: post.id,
    countryCode: cc,
    primaryTopicId: post.primaryTopic.id,
    secondaryTopicIds: post.secondaryTopics.map((topic) => topic.id),
    limit: 3,
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {schemaJson ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: schemaJson }}
          />
        ) : null}
        <BlogArticle post={post} cc={cc} />
        {relatedPosts.length ? (
          <section className="space-y-6" aria-labelledby="related-blog-heading">
            <div className="mx-auto max-w-4xl space-y-2 text-center sm:text-right">
              <h2 id="related-blog-heading" className="text-2xl font-bold tracking-tight">
                مقالات مشابهة
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                مقالات مرتبطة بنفس الموضوع تساعدك على التوسع في القراءة.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <BlogPostCard key={relatedPost.id} post={relatedPost} cc={cc} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <PublicFooter cc={cc} />
    </div>
  );
}

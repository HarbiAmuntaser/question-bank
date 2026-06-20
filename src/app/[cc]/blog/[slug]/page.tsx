import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogArticle } from "@/components/public/blog/blog-article";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header/public-header";
import { getPublicBlogPost, parseBlogCountry } from "@/lib/server/blog";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

type PageParams = { cc: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { cc: rawCc, slug } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) return {};

  const post = await getPublicBlogPost(cc, slug);
  if (!post) return {};

  const seo = post.seo;
  const canonical = seo?.canonicalUrl || `${SITE_URL}/${cc}/blog/${encodeURIComponent(post.slug)}`;
  const title = seo?.metaTitle || post.title;
  const description = seo?.metaDescription || post.excerpt || post.contentText?.slice(0, 160) || `مقال تعليمي من ${SITE_NAME}`;
  const ogTitle = seo?.ogTitle || title;
  const ogDescription = seo?.ogDescription || description;
  const ogImageUrl = seo?.ogImageUrl || post.coverAttachment?.url;

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
      images: ogImageUrl ? [{ url: ogImageUrl, alt: post.coverAttachment?.title || post.title }] : undefined,
    },
  };
}

export default async function PublicBlogPostPage({ params }: { params: Promise<PageParams> }) {
  const { cc: rawCc, slug } = await params;
  const cc = parseBlogCountry(rawCc);
  if (!cc) notFound();

  const post = await getPublicBlogPost(cc, slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <BlogArticle post={post} cc={cc} />
      </main>
      <PublicFooter cc={cc} />
    </div>
  );
}

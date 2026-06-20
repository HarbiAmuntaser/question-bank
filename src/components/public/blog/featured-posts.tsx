import Link from "next/link";
import { ArrowLeft, Clock3, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CountryCode } from "@/config/regions";
import type { PublicBlogPost } from "@/lib/server/blog";

import { BlogCover } from "./blog-cover";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

export function FeaturedPosts({ posts, cc }: { posts: PublicBlogPost[]; cc: CountryCode }) {
  if (!posts.length) return null;

  return (
    <section className="space-y-5" aria-labelledby="featured-blog-heading">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        <h2 id="featured-blog-heading" className="text-2xl font-bold tracking-tight">مقالات مميزة</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {posts.map((post, index) => {
          const href = `/${cc}/blog/${encodeURIComponent(post.slug)}`;
          return (
            <article key={post.id} className="overflow-hidden rounded-lg border bg-card shadow-sm lg:first:col-span-2 lg:first:row-span-2">
              <BlogCover
                attachment={post.coverAttachment}
                alt={post.title}
                eager={index === 0}
                className={index === 0 ? "aspect-[16/8]" : "aspect-[16/9]"}
              />
              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge>{post.primaryTopic.name}</Badge>
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  {post.readingMinutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                      {post.readingMinutes} دقائق
                    </span>
                  ) : null}
                </div>
                <h3 className="text-xl font-bold leading-9 sm:text-2xl">
                  <Link href={href} className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {post.title}
                  </Link>
                </h3>
                {post.excerpt ? <p className="line-clamp-3 text-sm leading-7 text-muted-foreground sm:text-base">{post.excerpt}</p> : null}
                <Link href={href} className="inline-flex min-h-10 items-center gap-2 rounded-md font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  قراءة المقال
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

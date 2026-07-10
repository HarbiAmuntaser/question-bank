import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";

import type { CountryCode } from "@/config/regions";
import type { PublicBlogPost } from "@/lib/server/blog";

import { BlogCover } from "./blog-cover";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function BlogPostCard({ post, cc, eager = false }: { post: PublicBlogPost; cc: CountryCode; eager?: boolean }) {
  const href = `/${cc}/blog/${encodeURIComponent(post.slug)}`;
  const topicHref = `/${cc}/blog/topics/${encodeURIComponent(post.primaryTopic.slug)}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-colors hover:border-primary/35">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`قراءة ${post.title}`}>
        <BlogCover attachment={post.coverAttachment} alt={post.title} eager={eager} />
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={topicHref}
            className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {post.primaryTopic.name}
          </Link>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.readingMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {post.readingMinutes} دقائق
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h2 className="line-clamp-2 text-lg font-bold leading-8 text-foreground">
            <Link href={href} className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {post.title}
            </Link>
          </h2>
          {post.excerpt ? <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{post.excerpt}</p> : null}
        </div>

        {post.tags.length ? (
          <div className="flex flex-wrap gap-1.5" aria-label="وسوم المقال">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={href}
          className="mt-auto inline-flex min-h-10 items-center gap-2 self-start rounded-md font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          قراءة المقال
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

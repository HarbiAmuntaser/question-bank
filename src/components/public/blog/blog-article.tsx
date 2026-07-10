import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CountryCode } from "@/config/regions";
import { prepareTrustedBlogHtml, type PublicBlogPost } from "@/lib/server/blog";

import { BlogCover } from "./blog-cover";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ar", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

export function BlogArticle({ post, cc }: { post: PublicBlogPost; cc: CountryCode }) {
  const safeHtml = post.contentHtml ? prepareTrustedBlogHtml(post.contentHtml) : null;
  const primaryTopicHref = `/${cc}/blog/topics/${encodeURIComponent(post.primaryTopic.slug)}`;

  return (
    <article className="mx-auto w-full max-w-4xl">
      <Link
        href={`/${cc}/blog`}
        className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowRight className="h-4 w-4" aria-hidden />
        العودة إلى المدونة
      </Link>

      <header className="space-y-5 text-center sm:text-right">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
          <Link
            href={primaryTopicHref}
            className="rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            الموضوع: {post.primaryTopic.name}
          </Link>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.readingMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {post.readingMinutes} دقائق قراءة
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-extrabold leading-[1.5] tracking-tight text-foreground sm:text-4xl lg:text-5xl">{post.title}</h1>
        {post.excerpt ? <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:mx-0 sm:text-lg">{post.excerpt}</p> : null}
        {post.secondaryTopics.length ? (
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start" aria-label="موضوعات إضافية">
            <span className="text-sm text-muted-foreground">موضوعات إضافية:</span>
            {post.secondaryTopics.slice(0, 3).map((topic) => (
              <Link
                key={topic.id}
                href={`/${cc}/blog/topics/${encodeURIComponent(topic.slug)}`}
                className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {topic.name}
              </Link>
            ))}
          </div>
        ) : null}
        {post.tags.length ? (
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start" aria-label="وسوم المقال">
            {post.tags.map((tag) => <Badge key={tag.id} variant="outline">{tag.name}</Badge>)}
          </div>
        ) : null}
      </header>

      <div className="my-8 overflow-hidden rounded-lg border shadow-sm">
        <BlogCover attachment={post.coverAttachment} alt={post.title} eager className="aspect-[16/7]" />
      </div>

      {safeHtml ? (
        <div
          className="text-base leading-9 text-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_blockquote]:my-6 [&_blockquote]:border-r-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-muted/40 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pr-6 [&_p]:my-5 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_table]:my-6 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pr-6"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : post.contentText ? (
        <div className="whitespace-pre-wrap text-base leading-9 text-foreground">{post.contentText}</div>
      ) : null}
    </article>
  );
}

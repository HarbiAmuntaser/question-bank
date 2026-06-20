import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { CountryCode } from "@/config/regions";
import { SUPPORTED_COUNTRIES } from "@/config/regions";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

const POST_INCLUDE = {
  primaryTopic: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  coverAttachment: { select: { id: true, url: true, title: true } },
} as const;

export type PublicBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string | null;
  contentText: string | null;
  publishedAt: string;
  readingMinutes: number | null;
  featured: boolean;
  primaryTopic: { id: string; name: string; slug: string };
  tags: Array<{ id: string; name: string; slug: string }>;
  coverAttachment: { id: string; url: string; title: string | null } | null;
  seo?: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
    nofollow: boolean;
  } | null;
};

export type PublicBlogListPage = {
  featured: PublicBlogPost[];
  posts: PublicBlogPost[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function parseBlogCountry(value: string): CountryCode | null {
  const normalized = value.trim().toUpperCase();
  return normalized in SUPPORTED_COUNTRIES ? (normalized as CountryCode) : null;
}

export function normalizeBlogSlug(value: string) {
  const slug = value.trim();
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function publishedWhere(cc: CountryCode, now: Date) {
  return {
    status: "published" as const,
    publishedAt: { not: null, lte: now },
    OR: [
      { visibility: "global" as const },
      {
        visibility: "countries" as const,
        countries: { some: { countryCode: cc } },
      },
    ],
  };
}

function serializePost(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string | null;
  contentText: string | null;
  publishedAt: Date | null;
  readingMinutes: number | null;
  featured: boolean;
  primaryTopic: { id: string; name: string; slug: string };
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
  coverAttachment: { id: string; url: string; title: string | null } | null;
}, seo?: PublicBlogPost["seo"]): PublicBlogPost {
  if (!post.publishedAt) throw new Error("published_blog_post_missing_date");

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    contentText: post.contentText,
    publishedAt: post.publishedAt.toISOString(),
    readingMinutes: post.readingMinutes,
    featured: post.featured,
    primaryTopic: post.primaryTopic,
    tags: post.tags.map(({ tag }) => tag),
    coverAttachment: post.coverAttachment,
    seo,
  };
}

async function queryPublicBlogPage(cc: CountryCode, page: number, pageSize: number): Promise<PublicBlogListPage> {
    const now = new Date();
    const where = publishedWhere(cc, now);

    const featuredRows = await prisma.blogPost.findMany({
      where: { ...where, featured: true },
      take: 3,
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      include: POST_INCLUDE,
    });
    const featuredIds = featuredRows.map((post) => post.id);
    const listWhere = { ...where, id: { notIn: featuredIds } };

    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: listWhere,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
        include: POST_INCLUDE,
      }),
      prisma.blogPost.count({ where: listWhere }),
    ]);

    return {
      featured: page === 1 ? featuredRows.map((post) => serializePost(post)) : [],
      posts: rows.map((post) => serializePost(post)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
}

export const getPublicBlogPage = cache(
  async (cc: CountryCode, requestedPage: number, pageSize = 9): Promise<PublicBlogListPage> => {
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 9;

    return unstable_cache(
      () => queryPublicBlogPage(cc, page, normalizedPageSize),
      ["public-blog-page", cc, String(page), String(normalizedPageSize)],
      {
        revalidate: CACHE_TTL.publicStable,
        tags: [
          CACHE_TAGS.public.blog,
          CACHE_TAGS.public.blogCountry(cc),
          CACHE_TAGS.public.blogTopics,
          CACHE_TAGS.public.blogTags,
        ],
      },
    )();
  },
);

async function getPublicBlogPostIdentity(cc: CountryCode, slug: string) {
  return unstable_cache(
    () =>
      prisma.blogPost.findFirst({
        where: {
          ...publishedWhere(cc, new Date()),
          slug,
        },
        select: { id: true, slug: true },
      }),
    ["public-blog-post-identity", cc, slug],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: [
        CACHE_TAGS.public.blog,
        CACHE_TAGS.public.blogCountry(cc),
        CACHE_TAGS.public.blogSlug(slug),
      ],
    },
  )();
}

export const getPublicBlogPost = cache(async (cc: CountryCode, slug: string): Promise<PublicBlogPost | null> => {
  const normalizedSlug = normalizeBlogSlug(slug);
  const identity = await getPublicBlogPostIdentity(cc, normalizedSlug);
  if (!identity) return null;

  return unstable_cache(
    async () => {
      const post = await prisma.blogPost.findFirst({
        where: {
          ...publishedWhere(cc, new Date()),
          id: identity.id,
          slug: normalizedSlug,
        },
        include: POST_INCLUDE,
      });
      if (!post) return null;

      const seo = await prisma.seoMeta.findFirst({
        where: {
          ownerType: "blog_post",
          ownerId: post.id,
          locale: "ar",
        },
        select: {
          metaTitle: true,
          metaDescription: true,
          ogTitle: true,
          ogDescription: true,
          ogImageUrl: true,
          canonicalUrl: true,
          noindex: true,
          nofollow: true,
        },
      });

      return serializePost(post, seo);
    },
    ["public-blog-post", cc, identity.id, normalizedSlug],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: [
        CACHE_TAGS.public.blog,
        CACHE_TAGS.public.blogCountry(cc),
        CACHE_TAGS.public.blogPost(identity.id),
        CACHE_TAGS.public.blogSlug(normalizedSlug),
        CACHE_TAGS.public.blogTopics,
        CACHE_TAGS.public.blogTags,
        CACHE_TAGS.public.seo,
        CACHE_TAGS.public.seoOwner("blog_post", identity.id),
      ],
    },
  )();
});

// Minimal defense-in-depth for trusted admin HTML. A dedicated sanitizer remains preferable
// before allowing broader editor roles or untrusted HTML sources.
export function prepareTrustedBlogHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|form|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

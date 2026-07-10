import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { CountryCode } from "@/config/regions";
import { SUPPORTED_COUNTRIES } from "@/config/regions";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

const POST_INCLUDE = {
  primaryTopic: { select: { id: true, name: true, slug: true } },
  secondaryTopics: { include: { topic: { select: { id: true, name: true, slug: true } } } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  coverAttachment: { select: { id: true, url: true, title: true } },
} as const;

type PublicBlogTopicLink = { id: string; name: string; slug: string };

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
  primaryTopic: PublicBlogTopicLink;
  secondaryTopics: PublicBlogTopicLink[];
  tags: Array<{ id: string; name: string; slug: string }>;
  coverAttachment: { id: string; url: string | null; title: string | null } | null;
  seo?: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
    nofollow: boolean;
    schemaJson: unknown;
  } | null;
};

export type PublicBlogTopic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type PublicBlogListPage = {
  topics: PublicBlogTopic[];
  featured: PublicBlogPost[];
  posts: PublicBlogPost[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type PublicBlogTopicSeo = {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
  schemaJson: unknown;
};

export type PublicBlogTopicPage = {
  topic: PublicBlogTopic & { seo: PublicBlogTopicSeo | null };
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
  primaryTopic: PublicBlogTopicLink;
  secondaryTopics: Array<{ topic: PublicBlogTopicLink }>;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
  coverAttachment: { id: string; url: string | null; title: string | null } | null;
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
    secondaryTopics: post.secondaryTopics.map(({ topic }) => topic),
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

    const [rows, total, topics] = await Promise.all([
      prisma.blogPost.findMany({
        where: listWhere,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
        include: POST_INCLUDE,
      }),
      prisma.blogPost.count({ where: listWhere }),
      prisma.blogTopic.findMany({
        where: {
          isActive: true,
          OR: [
            { primaryPosts: { some: where } },
            { secondaryPosts: { some: { post: where } } },
          ],
        },
        orderBy: { name: "asc" },
        take: 12,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
        },
      }),
    ]);

    return {
      topics,
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
      ["public-blog-page-v2", cc, String(page), String(normalizedPageSize)],
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

async function getPublicBlogTopicIdentity(slug: string) {
  return unstable_cache(
    () =>
      prisma.blogTopic.findFirst({
        where: {
          slug,
          isActive: true,
        },
        select: { id: true, slug: true },
      }),
    ["public-blog-topic-identity", slug],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: [CACHE_TAGS.public.blog, CACHE_TAGS.public.blogTopics],
    },
  )();
}

async function queryPublicBlogTopicPage(
  cc: CountryCode,
  topicId: string,
  page: number,
  pageSize: number,
): Promise<PublicBlogTopicPage | null> {
  const now = new Date();
  const visibilityWhere = publishedWhere(cc, now);
  const topicPostsWhere = {
    AND: [
      visibilityWhere,
      {
        OR: [
          { primaryTopicId: topicId },
          { secondaryTopics: { some: { topicId } } },
        ],
      },
    ],
  };

  const [topic, rows, total, seo] = await Promise.all([
    prisma.blogTopic.findFirst({
      where: {
        id: topicId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    }),
    prisma.blogPost.findMany({
      where: topicPostsWhere,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }],
      include: POST_INCLUDE,
    }),
    prisma.blogPost.count({ where: topicPostsWhere }),
    prisma.seoMeta.findFirst({
      where: {
        ownerType: "blog_topic",
        ownerId: topicId,
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
        schemaJson: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (!topic || total === 0 || page > totalPages) return null;

  return {
    topic: {
      ...topic,
      seo,
    },
    posts: rows.map((post) => serializePost(post)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export const getPublicBlogTopicPage = cache(
  async (cc: CountryCode, slug: string, requestedPage: number, pageSize = 9): Promise<PublicBlogTopicPage | null> => {
    const normalizedSlug = normalizeBlogSlug(slug);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 9;
    const identity = await getPublicBlogTopicIdentity(normalizedSlug);
    if (!identity) return null;

    return unstable_cache(
      () => queryPublicBlogTopicPage(cc, identity.id, page, normalizedPageSize),
      ["public-blog-topic-page", cc, identity.id, String(page), String(normalizedPageSize)],
      {
        revalidate: CACHE_TTL.publicStable,
        tags: [
          CACHE_TAGS.public.blog,
          CACHE_TAGS.public.blogCountry(cc),
          CACHE_TAGS.public.blogTopics,
          CACHE_TAGS.public.seo,
          CACHE_TAGS.public.seoOwner("blog_topic", identity.id),
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
          schemaJson: true,
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

export const getRelatedBlogPosts = cache(
  async ({
    currentPostId,
    countryCode,
    primaryTopicId,
    secondaryTopicIds,
    limit = 3,
  }: {
    currentPostId: string;
    countryCode: CountryCode;
    primaryTopicId: string;
    secondaryTopicIds: string[];
    limit?: number;
  }): Promise<PublicBlogPost[]> => {
    const normalizedLimit = Math.max(1, Math.min(6, Math.floor(limit)));
    const uniqueSecondaryTopicIds = Array.from(new Set(secondaryTopicIds.filter(Boolean)));

    return unstable_cache(
      async () => {
        const now = new Date();
        const baseWhere = {
          ...publishedWhere(countryCode, now),
          id: { not: currentPostId },
        };

        const primaryRows = await prisma.blogPost.findMany({
          where: {
            ...baseWhere,
            primaryTopicId,
          },
          take: normalizedLimit,
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          include: POST_INCLUDE,
        });

        const remaining = normalizedLimit - primaryRows.length;
        if (remaining <= 0 || uniqueSecondaryTopicIds.length === 0) {
          return primaryRows.map((post) => serializePost(post));
        }

        const secondaryRows = await prisma.blogPost.findMany({
          where: {
            ...baseWhere,
            id: { notIn: [currentPostId, ...primaryRows.map((post) => post.id)] },
            secondaryTopics: {
              some: {
                topicId: { in: uniqueSecondaryTopicIds },
              },
            },
          },
          take: remaining,
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          include: POST_INCLUDE,
        });

        return [...primaryRows, ...secondaryRows].map((post) => serializePost(post));
      },
      [
        "public-blog-related-posts",
        countryCode,
        currentPostId,
        primaryTopicId,
        uniqueSecondaryTopicIds.join(","),
        String(normalizedLimit),
      ],
      {
        revalidate: CACHE_TTL.publicStable,
        tags: [
          CACHE_TAGS.public.blog,
          CACHE_TAGS.public.blogCountry(countryCode),
          CACHE_TAGS.public.blogPost(currentPostId),
          CACHE_TAGS.public.blogTopics,
          CACHE_TAGS.public.blogTags,
        ],
      },
    )();
  },
);

// Minimal defense-in-depth for trusted admin HTML. A dedicated sanitizer remains preferable
// before allowing broader editor roles or untrusted HTML sources.
export function prepareTrustedBlogHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|form|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

export function prepareSeoSchemaJson(value: unknown) {
  if (value === null || typeof value === "undefined") return null;

  let schema = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      schema = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (schema === null || typeof schema !== "object") return null;
  if (Array.isArray(schema) && schema.length === 0) return null;
  if (!Array.isArray(schema) && Object.keys(schema).length === 0) return null;

  try {
    return JSON.stringify(schema).replace(/</g, "\\u003c");
  } catch {
    return null;
  }
}

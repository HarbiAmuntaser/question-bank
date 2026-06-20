import { BlogPostStatus, BlogVisibility, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bad, json, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateBlogCache } from "@/lib/cache-invalidation";
import { createBlogPostSchema, listBlogPostsQuerySchema } from "@/validations/blog";

export const dynamic = "force-dynamic";

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function contentPayload(contentHtml: string | null | undefined, contentText: string | null | undefined) {
  const html = contentHtml?.trim() || null;
  const text = contentText?.trim() || (html ? stripHtml(html) : null);

  return {
    contentHtml: html,
    contentText: text,
    content: {
      type: html ? "html" : "text",
      value: html ?? text ?? "",
    },
  };
}

function publishDate(status: BlogPostStatus, provided?: Date) {
  if (provided) return provided;
  return status === "published" ? new Date() : null;
}

function duplicateError() {
  return bad("duplicate_blog_post", { fields: ["language", "slug"] }, 409);
}

function serializePost(
  post: Prisma.BlogPostGetPayload<{
    include: {
      primaryTopic: true;
      tags: { include: { tag: true } };
      countries: true;
      coverAttachment: true;
    };
  }>,
) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    status: post.status,
    visibility: post.visibility,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    readingMinutes: post.readingMinutes,
    featured: post.featured,
    sortOrder: post.sortOrder,
    contentHtml: post.contentHtml,
    contentText: post.contentText,
    coverAttachmentId: post.coverAttachmentId,
    coverAttachment: post.coverAttachment
      ? {
          id: post.coverAttachment.id,
          url: post.coverAttachment.url,
          title: post.coverAttachment.title,
        }
      : null,
    primaryTopic: {
      id: post.primaryTopic.id,
      name: post.primaryTopic.name,
      slug: post.primaryTopic.slug,
    },
    tags: post.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, slug: tag.slug })),
    countries: post.countries.map((country) => country.countryCode),
  };
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const parsed = listBlogPostsQuerySchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    query: url.searchParams.get("query"),
    status: url.searchParams.get("status") ?? "all",
    sortBy: url.searchParams.get("sortBy"),
    sortOrder: url.searchParams.get("sortOrder"),
  });

  if (!parsed.success) return bad("bad_query_params", parsed.error.flatten());

  const { page, pageSize, query, status, sortBy, sortOrder } = parsed.data;
  const andParts: Prisma.BlogPostWhereInput[] = [];

  if (query) {
    andParts.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (status !== "all") andParts.push({ status: status as BlogPostStatus });

  const where: Prisma.BlogPostWhereInput = andParts.length ? { AND: andParts } : {};

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder } as Prisma.BlogPostOrderByWithRelationInput,
      include: {
        primaryTopic: true,
        tags: { include: { tag: true } },
        countries: true,
        coverAttachment: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return json(
    {
      data: rows.map(serializePost),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    },
    { status: 200, headers: privateHeaders() },
  );
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createBlogPostSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const input = parsed.data;
  const content = contentPayload(input.contentHtml, input.contentText);

  try {
    const created = await prisma.blogPost.create({
      data: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        status: input.status,
        visibility: input.visibility as BlogVisibility,
        publishedAt: publishDate(input.status as BlogPostStatus, input.publishedAt),
        primaryTopicId: input.primaryTopicId,
        coverAttachmentId: input.coverAttachmentId ?? null,
        readingMinutes: input.readingMinutes ?? null,
        featured: input.featured,
        sortOrder: input.sortOrder,
        content: content.content,
        contentHtml: content.contentHtml,
        contentText: content.contentText,
        createdBy: auth.userId === "api-key" ? null : auth.userId,
        updatedBy: auth.userId === "api-key" ? null : auth.userId,
        tags: {
          create: input.tagIds.map((tagId) => ({ tagId })),
        },
        countries: {
          create: input.visibility === "countries" ? input.countries.map((countryCode) => ({ countryCode })) : [],
        },
      },
      include: {
        primaryTopic: true,
        tags: { include: { tag: true } },
        countries: true,
        coverAttachment: true,
      },
    });

    revalidateBlogCache({
      postId: created.id,
      next: {
        slug: created.slug,
        visibility: created.visibility,
        countries: created.countries.map((country) => country.countryCode),
        status: created.status,
        publishedAt: created.publishedAt,
      },
    });

    return json({ data: serializePost(created), message: "blog_post_created" }, { status: 201, headers: privateHeaders() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return duplicateError();
      if (error.code === "P2003") return bad("invalid_blog_post_relation");
    }
    return bad("failed_to_create_blog_post");
  }
}

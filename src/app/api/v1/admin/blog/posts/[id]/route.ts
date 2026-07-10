import { BlogPostStatus, BlogVisibility, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bad, json, notFound, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateBlogCache } from "@/lib/cache-invalidation";
import { updateBlogPostSchema } from "@/validations/blog";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

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

const includePost = {
  primaryTopic: true,
  tags: { include: { tag: true } },
  countries: true,
  coverAttachment: true,
} satisfies Prisma.BlogPostInclude;

export async function GET(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: includePost,
  });

  if (!post) return notFound("blog_post_not_found");

  return json({ data: serializePost(post) }, { status: 200, headers: privateHeaders() });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = updateBlogPostSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const input = parsed.data;

  try {
    const { updated, previous } = await prisma.$transaction(async (tx) => {
      const existing = await tx.blogPost.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
          status: true,
          visibility: true,
          publishedAt: true,
          countries: { select: { countryCode: true } },
        },
      });

      if (!existing) throw new Error("blog_post_not_found");

      if (typeof input.tagIds !== "undefined") {
        await tx.blogPostTag.deleteMany({ where: { postId: id } });
      }

      if (typeof input.countries !== "undefined" || input.visibility === "global") {
        await tx.blogPostCountry.deleteMany({ where: { postId: id } });
      }

      const content =
        typeof input.contentHtml !== "undefined" || typeof input.contentText !== "undefined"
          ? contentPayload(input.contentHtml, input.contentText)
          : null;
      const updater =
        auth.userId !== "api-key"
          ? await tx.user.findUnique({
              where: { id: auth.userId },
              select: { id: true },
            })
          : null;

      const data: Prisma.BlogPostUpdateInput = {
        ...(typeof input.title !== "undefined" ? { title: input.title } : {}),
        ...(typeof input.slug !== "undefined" ? { slug: input.slug } : {}),
        ...(typeof input.excerpt !== "undefined" ? { excerpt: input.excerpt } : {}),
        ...(typeof input.primaryTopicId !== "undefined" ? { primaryTopic: { connect: { id: input.primaryTopicId } } } : {}),
        ...(typeof input.status !== "undefined" ? { status: input.status as BlogPostStatus } : {}),
        ...(typeof input.visibility !== "undefined" ? { visibility: input.visibility as BlogVisibility } : {}),
        ...(typeof input.publishedAt !== "undefined" ? { publishedAt: input.publishedAt } : {}),
        ...(input.status === "published" && !existing.publishedAt && typeof input.publishedAt === "undefined"
          ? { publishedAt: new Date() }
          : {}),
        ...(typeof input.coverAttachmentId !== "undefined" ? { coverAttachment: input.coverAttachmentId ? { connect: { id: input.coverAttachmentId } } : { disconnect: true } } : {}),
        ...(typeof input.readingMinutes !== "undefined" ? { readingMinutes: input.readingMinutes ?? null } : {}),
        ...(typeof input.featured !== "undefined" ? { featured: input.featured } : {}),
        ...(typeof input.sortOrder !== "undefined" ? { sortOrder: input.sortOrder } : {}),
        ...(content
          ? {
              content: content.content,
              contentHtml: content.contentHtml,
              contentText: content.contentText,
            }
          : {}),
        ...(updater ? { updater: { connect: { id: updater.id } } } : {}),
        ...(typeof input.tagIds !== "undefined"
          ? {
              tags: {
                create: input.tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
        ...(input.visibility === "countries" && typeof input.countries !== "undefined"
          ? {
              countries: {
                create: input.countries.map((countryCode) => ({ countryCode })),
              },
            }
          : {}),
      };

      const updatedPost = await tx.blogPost.update({
        where: { id },
        data,
        include: includePost,
      });

      return {
        updated: updatedPost,
        previous: {
          slug: existing.slug,
          status: existing.status,
          visibility: existing.visibility,
          publishedAt: existing.publishedAt,
          countries: existing.countries.map((country) => country.countryCode),
        },
      };
    });

    try {
      revalidateBlogCache({
        postId: updated.id,
        previous,
        next: {
          slug: updated.slug,
          status: updated.status,
          visibility: updated.visibility,
          publishedAt: updated.publishedAt,
          countries: updated.countries.map((country) => country.countryCode),
        },
      });
    } catch (error) {
      console.error("failed_to_revalidate_blog_post_cache", error instanceof Error ? error.message : "unknown_error");
    }

    return json({ data: serializePost(updated), message: "blog_post_updated" }, { status: 200, headers: privateHeaders() });
  } catch (error) {
    if (error instanceof Error && error.message === "blog_post_not_found") {
      return notFound("blog_post_not_found");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return notFound("blog_post_not_found");
      if (error.code === "P2002") return duplicateError();
      if (error.code === "P2003") return bad("invalid_blog_post_relation");
    }
    return bad("failed_to_update_blog_post");
  }
}

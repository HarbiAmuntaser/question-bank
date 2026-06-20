import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bad, json, notFound, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateBlogCache } from "@/lib/cache-invalidation";
import { updateBlogTopicSchema } from "@/validations/blog";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function duplicateError() {
  return bad("duplicate_blog_topic", { fields: ["name", "slug"] }, 409);
}

export async function GET(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  const topic = await prisma.blogTopic.findUnique({
    where: { id },
    include: {
      _count: { select: { primaryPosts: true, secondaryPosts: true } },
    },
  });

  if (!topic) return notFound("blog_topic_not_found");

  return json(
    {
      data: {
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        isActive: topic.isActive,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        postsCount: topic._count.primaryPosts + topic._count.secondaryPosts,
      },
    },
    { status: 200, headers: privateHeaders() },
  );
}

export async function PUT(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = updateBlogTopicSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const updated = await prisma.blogTopic.update({
      where: { id },
      data: parsed.data,
    });

    revalidateBlogCache({ taxonomy: "topics", allCountries: true });

    return json({ data: updated }, { status: 200, headers: privateHeaders() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return notFound("blog_topic_not_found");
      if (error.code === "P2002") return duplicateError();
    }
    return bad("failed_to_update_blog_topic");
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  try {
    const updated = await prisma.blogTopic.update({
      where: { id },
      data: { isActive: false },
    });

    revalidateBlogCache({ taxonomy: "topics", allCountries: true });

    return json({ data: updated, message: "blog_topic_disabled" }, { status: 200, headers: privateHeaders() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return notFound("blog_topic_not_found");
    }
    return bad("failed_to_disable_blog_topic");
  }
}

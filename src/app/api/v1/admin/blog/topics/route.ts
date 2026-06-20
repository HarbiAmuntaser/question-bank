import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bad, json, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateBlogCache } from "@/lib/cache-invalidation";
import { createBlogTopicSchema, listBlogTaxonomyQuerySchema } from "@/validations/blog";

export const dynamic = "force-dynamic";

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function duplicateError() {
  return bad("duplicate_blog_topic", { fields: ["name", "slug"] }, 409);
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const parsed = listBlogTaxonomyQuerySchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    query: url.searchParams.get("query"),
    status: url.searchParams.get("status") ?? "all",
    sortBy: url.searchParams.get("sortBy"),
    sortOrder: url.searchParams.get("sortOrder"),
  });

  if (!parsed.success) return bad("bad_query_params", parsed.error.flatten());

  const { page, pageSize, query, status, sortBy, sortOrder } = parsed.data;
  const andParts: Prisma.BlogTopicWhereInput[] = [];

  if (query) {
    andParts.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (status === "active") andParts.push({ isActive: true });
  if (status === "inactive") andParts.push({ isActive: false });

  const where: Prisma.BlogTopicWhereInput = andParts.length ? { AND: andParts } : {};

  const [rows, total] = await Promise.all([
    prisma.blogTopic.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { primaryPosts: true, secondaryPosts: true } },
      },
    }),
    prisma.blogTopic.count({ where }),
  ]);

  const data = rows.map((topic) => ({
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    description: topic.description,
    isActive: topic.isActive,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    postsCount: topic._count.primaryPosts + topic._count.secondaryPosts,
  }));

  return json(
    {
      data,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    },
    { status: 200, headers: privateHeaders() },
  );
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createBlogTopicSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const created = await prisma.blogTopic.create({
      data: parsed.data,
    });

    revalidateBlogCache({ taxonomy: "topics", allCountries: true });

    return json({ data: created }, { status: 201, headers: privateHeaders() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return duplicateError();
    }
    return bad("failed_to_create_blog_topic");
  }
}

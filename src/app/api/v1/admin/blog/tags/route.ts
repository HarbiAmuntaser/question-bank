import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bad, json, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateBlogCache } from "@/lib/cache-invalidation";
import { createBlogTagSchema, listBlogTaxonomyQuerySchema } from "@/validations/blog";

export const dynamic = "force-dynamic";

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function duplicateError() {
  return bad("duplicate_blog_tag", { fields: ["name", "slug"] }, 409);
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
  const andParts: Prisma.BlogTagWhereInput[] = [];

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

  const where: Prisma.BlogTagWhereInput = andParts.length ? { AND: andParts } : {};

  const [rows, total] = await Promise.all([
    prisma.blogTag.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { posts: true } },
      },
    }),
    prisma.blogTag.count({ where }),
  ]);

  const data = rows.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    isActive: tag.isActive,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    postsCount: tag._count.posts,
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
  const parsed = createBlogTagSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const created = await prisma.blogTag.create({
      data: parsed.data,
    });

    revalidateBlogCache({ taxonomy: "tags", allCountries: true });

    return json({ data: created }, { status: 201, headers: privateHeaders() });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return duplicateError();
    }
    return bad("failed_to_create_blog_tag");
  }
}

// src/app/api/v1/admin/universities/route.ts

import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  listQuerySchema,
  createUniversitySchema,
} from "@/validations/university";
import { unstable_cache, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

// ---- Cached list helper ----
const listUniversitiesCached = unstable_cache(
  async (q: Record<string, string | null>) => {
    const parsed = listQuerySchema.safeParse(q);
    if (!parsed.success) throw new Error("bad_query");
    const { page, pageSize, sortBy, sortOrder, query } = parsed.data;

    const where = query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query, mode: "insensitive" as const } },
            { city: { contains: query, mode: "insensitive" as const } },
            { region: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.university.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { majors: true } } },
      }),
      prisma.university.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
  ["admin-universities-list"],
  { revalidate: 3600, tags: ["universities"] }
);

// ---- GET /api/v1/admin/universities ----
// ---- GET /api/v1/admin/universities ----
export async function GET(req: Request) {
  const url = new URL(req.url);

  // تحويل آمن + قيم افتراضية
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? "20") || 20;
  const pageSize = Math.min(Math.max(1, pageSizeRaw), 1000);
  const sortByParam = url.searchParams.get("sortBy") ?? "createdAt";
  const sortBy = sortByParam === "name" ? "name" : "createdAt";
  const sortOrderParam = url.searchParams.get("sortOrder") ?? "desc";
  const sortOrder = sortOrderParam === "asc" ? "asc" : "desc";
  const query = (url.searchParams.get("query") ?? "").trim();

  // 👇 جديد
  const countryCode = (url.searchParams.get("countryCode") ?? "").trim();
  const institutionType = (url.searchParams.get("institutionType") ?? "").trim() as
    | "university"
    | "school"
    | "academy"
    | "";

  // WHERE مرن يجمع البحث النصي + الفلاتر
  const and: any[] = [];

  if (query.length > 0) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { code: { contains: query, mode: "insensitive" as const } },
        { city: { contains: query, mode: "insensitive" as const } },
        { region: { contains: query, mode: "insensitive" as const } },
      ],
    });
  }

  if (countryCode) and.push({ countryCode });
  if (institutionType) and.push({ institutionType });

  const where = and.length ? { AND: and } : {};

  const [data, total] = await Promise.all([
    prisma.university.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { majors: true } } },
    }),
    prisma.university.count({ where }),
  ]);

  const headers = new Headers({
    "cache-control": "public, s-maxage=3600, stale-while-revalidate=60",
  });

  return json(
    {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    { status: 200, headers }
  );
}


// ---- POST /api/v1/admin/universities ----
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createUniversitySchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const created = await prisma.university.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code ?? null,
        city: parsed.data.city ?? null,
        region: parsed.data.region ?? null,
        logoUrl: parsed.data.logoUrl ?? null,
        isActive: parsed.data.isActive,
        // عند المصادقة بمفتاح أدمن لا يوجد userId حقيقي → تجنّب انتهاك FK
        createdBy: auth.userId !== "api-key" ? auth.userId : null,

        countryCode: parsed.data.countryCode.toUpperCase(),
        institutionType: parsed.data.institutionType,
      },
    });

    revalidateTag("universities");
    return json({ data: created }, 201);
  } catch (e) {
    // إعادة رد JSON واضح بدل انهيار 500 غير مهيكل
    return bad("db_error", {
      code: (e as { code?: string }).code ?? "UNKNOWN",
    });
  }
}

// ============================================================================
// file: src/app/api/v1/student/universities/route.ts
// عام: قائمة مؤسسات (جامعات/مدارس/أكاديميات) للواجهة العامة مع إحصاءات خفيفة
// يدعم فلاتر الدولة cc (SA/YE/..) والنوع type (university|school|academy)
// مع البحث q وحدّ limit وخيار withMajors لإرجاع بعض التخصصات.
// ============================================================================

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { cacheTags, CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type Q = {
  q?: string | null;
  sort?: string | null; // "popular" | "name"
  limit?: string | null;
  withMajors?: string | null; // "1" | "true"
  cc?: string | null;         // SA | YE | EG ...
  type?: string | null;       // university | school | academy
};

// ✅ مهم: unstable_cache يأخذ keyParts ثابتة (string[])،
// وNext سيُميّز الكاش تلقائياً حسب Arguments (q) التي نمررها للدالة.
const listUniversitiesCached = (q: Q) =>
  unstable_cache(
  async () => {
    const search = (q.q ?? "").trim();
    const rawLimit = Number(q.limit ?? "60");
    const limit = Math.min(Math.max(rawLimit || 60, 1), 1000);

    const withMajors = (q.withMajors ?? "").toLowerCase();
    const includeMajors = withMajors === "1" || withMajors === "true";

    const cc = (q.cc ?? "").trim().toUpperCase(); // SA/YE/..
    const typeRaw = (q.type ?? "").trim().toLowerCase();
    const validTypes = new Set(["university", "school", "academy"]);
    const instType = validTypes.has(typeRaw)
      ? (typeRaw as "university" | "school" | "academy")
      : null;

        // sort: افتراضي name، ويمكن popular للترتيب حسب عدد التخصصات
    const sortRaw = (q.sort ?? "").trim().toLowerCase();
    const sort = sortRaw === "popular" ? "popular" : "name";

    // ترتيب Prisma
    // - popular: بالأكثر تخصصات ثم الاسم
    // - name: بالاسم فقط
    const orderBy =
      sort === "popular"
        ? [
            // ترتيب حسب عدد التخصصات (majors)
            { majors: { _count: "desc" as const } },
            { name: "asc" as const },
          ]
        : [{ name: "asc" as const }];

    // فلترة الدولة والنوع (مع البحث)
    const where: any = {
      isActive: true,
      ...(cc ? { countryCode: cc } : {}),
      ...(instType ? { institutionType: instType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { code: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
              { region: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const universities = await prisma.university.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        _count: { select: { majors: true } },
        ...(includeMajors
          ? {
              majors: {
                where: { isActive: true },
                orderBy: { name: "asc" },
                select: {
                  id: true,
                  name: true,
                  code: true,
                  _count: { select: { subjects: true } },
                },
                take: 2, // للعرض المختصر
              },
            }
          : {}),
      },
    });

    // عدد الاختبارات لكل مؤسسة
    const quizzesCounts = await Promise.all(
      universities.map((u) =>
        prisma.quiz.count({
          where: {
            isActive: true,
            subject: { major: { universityId: u.id } },
          },
        })
      )
    );

    return universities.map((u, idx) => ({
      id: u.id,
      name: u.name,
      code: u.code,
      city: u.city,
      region: u.region,
      logoUrl: u.logoUrl,
      countryCode: u.countryCode ?? null,
      institutionType: u.institutionType ?? null,
      _count: {
        majors: u._count.majors,
        quizzes: quizzesCounts[idx] ?? 0,
      },
      ...(includeMajors ? { majors: u.majors } : { majors: [] as never[] }),
    }));
  },
  [
    "student-universities",
    q.q ?? "",
    q.sort ?? "",
    q.limit ?? "",
    q.withMajors ?? "",
    q.cc ?? "",
    q.type ?? "",
  ],
  {
    revalidate: CACHE_TTL.publicStable,
    tags: cacheTags(
      "student-universities",
      CACHE_TAGS.public.institutions,
      q.cc ? CACHE_TAGS.public.institutionsCountry(q.cc) : null
    ),
  }
)();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q: Q = {
      q: url.searchParams.get("q"),
      sort: url.searchParams.get("sort"),
      limit: url.searchParams.get("limit"),
      withMajors: url.searchParams.get("withMajors"),
      cc: url.searchParams.get("cc"),
      type: url.searchParams.get("type"),
    };

    const data = await listUniversitiesCached(q);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable),
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_list_universities");
  }
}

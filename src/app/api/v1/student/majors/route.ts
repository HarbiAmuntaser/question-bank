// src/app/api/v1/student/majors/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universityId = searchParams.get("universityId") || undefined;

    const data = await prisma.major.findMany({
      where: { isActive: true, ...(universityId ? { universityId } : {}) },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        universityId: true,
        degreeType: true,
      },
    });

    const headers = new Headers({
      "cache-control": "public, s-maxage=600, stale-while-revalidate=60",
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_majors");
  }
}

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universityId = searchParams.get("universityId") || undefined;

    const rows = await prisma.major.findMany({
      where: { isActive: true, ...(universityId ? { universityId } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, degreeType: true, universityId: true, createdAt: true, updatedAt: true },
    });
    const headers = new Headers({ "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable) });
    return json({ data: rows }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_majors_select");
  }
}

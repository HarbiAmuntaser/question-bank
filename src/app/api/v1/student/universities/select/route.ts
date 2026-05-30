import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.university.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    const headers = new Headers({ "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable) });
    return json({ data: rows }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_universities_select");
  }
}

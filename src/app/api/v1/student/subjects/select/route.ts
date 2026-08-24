import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { publicSubjectWhere } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const majorId = searchParams.get("majorId") || undefined;

    const rows = await prisma.subject.findMany({
      where: {
        isActive: true,
        ...publicSubjectWhere(),
        ...(majorId ? { majorId } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, majorId: true },
    });
    const headers = new Headers({ "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable) });
    return json({ data: rows }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subjects_select");
  }
}

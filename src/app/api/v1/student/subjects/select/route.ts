import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const majorId = searchParams.get("majorId") || undefined;

    const rows = await prisma.subject.findMany({
      where: { isActive: true, ...(majorId ? { majorId } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, majorId: true },
    });
    const headers = new Headers({ "cache-control": "public, s-maxage=600, stale-while-revalidate=60" });
    return json({ data: rows }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subjects_select");
  }
}

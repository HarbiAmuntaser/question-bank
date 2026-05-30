// src/app/api/v1/student/subjects/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { cacheTags, CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const listSubjectsCached = (input: { majorId?: string; universityId?: string }) =>
  unstable_cache(
    async () =>
      prisma.subject.findMany({
        where: {
          isActive: true,
          ...(input.majorId ? { majorId: input.majorId } : {}),
          ...(input.universityId ? { major: { universityId: input.universityId } } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, majorId: true },
      }),
    ["student-subjects-list", input.majorId ?? "", input.universityId ?? ""],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: cacheTags(
        "student-subjects",
        CACHE_TAGS.public.subjects,
        input.majorId ? CACHE_TAGS.public.subjectsByMajor(input.majorId) : null
      ),
    }
  )();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const majorId = searchParams.get("majorId") || undefined;
    const universityId = searchParams.get("universityId") || undefined;

    const data = await listSubjectsCached({ majorId, universityId });

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable),
    });

    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subjects");
  }
}

import { unstable_cache as cache } from "next/cache";
import { prisma as db } from "@/lib/prisma";
import { json as ok, bad as err } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

const getStatsCached = cache(
  async () => {
    const [totalUniversities, totalSubjects, totalQuizzes, totalQuestions] = await Promise.all([
      db.university.count({ where: { isActive: true } }),
      db.subject.count({ where: { isActive: true } }),
      db.quiz.count({ where: { isActive: true } }),
      db.question.count({ where: { isActive: true } }),
    ]);

    return { totalUniversities, totalSubjects, totalQuizzes, totalQuestions };
  },
  ["student-stats"],
  { revalidate: CACHE_TTL.publicStable, tags: ["student-stats", CACHE_TAGS.public.stats] }
);

export async function GET() {
  try {
    const data = await getStatsCached();
    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable),
    });
    return ok({ data }, { status: 200, headers });
  } catch {
    return err("failed_to_get_stats");
  }
}

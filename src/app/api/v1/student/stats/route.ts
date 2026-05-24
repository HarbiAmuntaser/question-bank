import { unstable_cache as cache } from "next/cache";
import { prisma as db } from "@/lib/prisma";
import { json as ok, bad as err } from "@/lib/http";

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
  { revalidate: 600, tags: ["student-stats"] }
);

export async function GET() {
  try {
    const data = await getStatsCached();
    const headers = new Headers({
      "cache-control": "public, s-maxage=600, stale-while-revalidate=60",
    });
    return ok({ data }, { status: 200, headers });
  } catch {
    return err("failed_to_get_stats");
  }
}

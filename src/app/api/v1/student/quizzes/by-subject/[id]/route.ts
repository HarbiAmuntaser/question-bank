/* Fixed Next 15 params typing */

// file: src/app/api/v1/student/quizzes/by-subject/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type Q = { limit?: string | null; degreeType?: string | null };
type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

const listBySubjectCached = (subjectId: string, q: Q) =>
  unstable_cache(
    async () => {
      const rawLimit = Number(q.limit ?? "60");
      const limit = Math.min(Math.max(rawLimit || 60, 1), 200);
      const degreeType = (q.degreeType ?? "").trim();

      const and: any[] = [
        {
          OR: [
            { subjectId },
            { questions: { some: { question: { chapter: { subjectId } } } } },
          ],
        },
      ];

      if (degreeType) {
        and.push({
          OR: [
            { subject: { major: { degreeType } } },
            { questions: { some: { question: { chapter: { subject: { major: { degreeType } } } } } } },
          ],
        });
      }

      const quizzes = await prisma.quiz.findMany({
        where: { isActive: true, AND: and },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          createdAt: true,
          accessType: true,
          isFreePreview: true,
          _count: { select: { questions: true } },
        },
      });

      const ids = quizzes.map((q) => q.id);
      const seoRows = ids.length
        ? await prisma.seoMeta.findMany({
            where: { ownerType: "exam", locale: "ar", ownerId: { in: ids } },
            select: { ownerId: true, slug: true },
          })
        : [];

      const seoMap = new Map(seoRows.map((r) => [r.ownerId, r.slug]));

      return quizzes.map((q) => ({
        ...q,
        seo: { slug: seoMap.get(q.id) ?? null },
      }));
    },
    ["student-quizzes-by-subject", subjectId, q.degreeType ?? "", q.limit ?? ""],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: [
        "student-quizzes",
        "student-quizzes-by-subject",
        CACHE_TAGS.public.quizzes,
        CACHE_TAGS.public.quizzesBySubject(subjectId),
      ],
    }
  )();

export async function GET(req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = rawId?.trim();

  if (!id) return bad("missing_id", undefined, 400);

  try {
    const url = new URL(req.url);
    const q: Q = {
      limit: url.searchParams.get("limit"),
      degreeType: url.searchParams.get("degreeType"),
    };

    const data = await listBySubjectCached(id, q);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_list_quizzes_by_subject");
  }
}

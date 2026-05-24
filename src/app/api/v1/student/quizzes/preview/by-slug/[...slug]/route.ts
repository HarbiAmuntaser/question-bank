/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] };
type RouteContext = {
  params: Promise<RouteParams>;
};

function normalizeSlugParts(parts: string[]) {
  const clean = (parts ?? []).map((p) => decodeURIComponent(p).trim()).filter(Boolean);
  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;

  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = slugPath.replace(/^اختبارات\//, "");

  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean))
  );

  return { slugPath, variants, last };
}

async function findQuizIdByAny(slugPath: string, variants: string[], last: string) {
  const direct = await prisma.seoMeta.findFirst({
    where: { ownerType: "exam", locale: "ar", slug: { in: variants } },
    select: { ownerId: true },
  });
  if (direct?.ownerId) return direct.ownerId;

  const ends = await prisma.seoMeta.findFirst({
    where: { ownerType: "exam", locale: "ar", slug: { endsWith: last } },
    select: { ownerId: true },
  });
  return ends?.ownerId ?? null;
}

const getPreviewCached = (id: string) =>
  unstable_cache(
    async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1/student/quizzes/preview/by-id/${encodeURIComponent(id)}`,
        {
          cache: "no-store",
        }
      ).catch(() => null);

      if (!res || !res.ok) {
        const quiz = await prisma.quiz.findFirst({
          where: { id, isActive: true },
          select: { id: true },
        });
        if (!quiz) return null;
      }

      const body = res ? await res.json().catch(() => null) : null;
      return body?.data ?? null;
    },
    ["student-quiz-preview-by-slug-id", id],
    { revalidate: 300, tags: ["student-quizzes", "student-quiz-preview"] }
  )();

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug: slugArr } = await params;
  const { slugPath, variants, last } = normalizeSlugParts(slugArr);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const quizId = await findQuizIdByAny(slugPath, variants, last);
    if (!quizId) return bad("not_found", undefined, 404);

    const data = await getPreviewCached(quizId);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": "public, s-maxage=300, stale-while-revalidate=60",
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_preview_by_slug", undefined, 500);
  }
}
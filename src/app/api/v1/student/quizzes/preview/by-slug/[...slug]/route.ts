/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";
import { getPublicVisibilityCacheKey } from "@/config/public-features";
import {
  isPublicQuizId,
  publicQuizWhere,
} from "@/lib/server/public-content-visibility";

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

const getPreviewCached = (id: string, origin: string) =>
  unstable_cache(
    async () => {
      const res = await fetch(
        `${origin}/api/v1/student/quizzes/preview/by-id/${encodeURIComponent(id)}`,
        {
          cache: "no-store",
        }
      ).catch(() => null);

      if (!res || !res.ok) {
        const quiz = await prisma.quiz.findFirst({
          where: { id, isActive: true, ...publicQuizWhere() },
          select: { id: true },
        });
        if (!quiz) return null;
      }

      const body = res ? await res.json().catch(() => null) : null;
      return body?.data ?? null;
    },
    ["student-quiz-preview-by-slug-id", id, getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicLong,
      tags: ["student-quizzes", "student-quiz-preview", CACHE_TAGS.public.quizzes, CACHE_TAGS.public.quiz(id)],
    }
  )();

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug: slugArr } = await params;
  const { slugPath, variants, last } = normalizeSlugParts(slugArr);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const quizId = await findQuizIdByAny(slugPath, variants, last);
    if (!quizId) return bad("not_found", undefined, 404);
    if (!(await isPublicQuizId(quizId))) return bad("not_found", undefined, 404);

    const data = await getPreviewCached(quizId, new URL(_req.url).origin);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_preview_by_slug", undefined, 500);
  }
}

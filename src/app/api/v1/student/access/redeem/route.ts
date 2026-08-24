import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import {
  RedeemCodeError,
  checkQuizAccess,
  checkScopeAccess,
  redeemSubscriptionCode,
} from "@/lib/server/access-control";
import { isSubscriptionCodeForPublicContent } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const headers = new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });

  try {
    const body = (await req.json().catch(() => null)) as {
      code?: unknown;
      quizId?: unknown;
      subjectId?: unknown;
      majorId?: unknown;
    } | null;

    const code = typeof body?.code === "string" ? body.code : "";
    if (!code.trim()) return json({ error: "missing_code" }, { status: 400, headers });

    const quizId = typeof body?.quizId === "string" ? body.quizId.trim() : "";
    const subjectId = typeof body?.subjectId === "string" ? body.subjectId.trim() : "";
    const majorId = typeof body?.majorId === "string" ? body.majorId.trim() : "";

    const codeTargetsPublicContent = await isSubscriptionCodeForPublicContent(code);
    if (codeTargetsPublicContent === false) {
      return json({ error: "invalid_code", code: "invalid_code" }, { status: 400, headers });
    }

    const { session } = await getOrCreateAnonymousSession();
    const redeemed = await redeemSubscriptionCode({ code, anonymousSessionId: session.id });
    const access = quizId
      ? await checkQuizAccess({ quizId, anonymousSessionId: session.id })
      : subjectId || majorId
        ? await checkScopeAccess({ subjectId, majorId, anonymousSessionId: session.id })
        : null;

    return json(
      {
        data: {
          redeemed: true,
          alreadyRedeemed: redeemed.alreadyRedeemed,
          codePreview: redeemed.codePreview,
          entitlement: redeemed.entitlement,
          plan: redeemed.plan,
          access,
        },
      },
      { status: 200, headers },
    );
  } catch (error) {
    if (error instanceof RedeemCodeError) {
      return json({ error: error.message, code: error.code }, { status: error.status, headers });
    }
    return json({ error: "failed_to_redeem_code" }, { status: 500, headers });
  }
}

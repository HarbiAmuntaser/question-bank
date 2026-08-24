import type { ContactMethod } from "@prisma/client";

import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import { RedeemCodeError, createManualPaymentRequest } from "@/lib/server/access-control";
import { isPublicPaidAccessPlanId } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

function parseContactMethod(value: unknown): ContactMethod | null {
  return value === "whatsapp" || value === "telegram" ? value : null;
}

export async function POST(req: Request) {
  const headers = new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });

  try {
    const body = (await req.json().catch(() => null)) as {
      planId?: unknown;
      contactMethod?: unknown;
      contactValue?: unknown;
      message?: unknown;
      pageUrl?: unknown;
    } | null;

    const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
    if (!planId) return json({ error: "missing_plan_id" }, { status: 400, headers });
    if (!(await isPublicPaidAccessPlanId(planId))) {
      return json({ error: "plan_not_found" }, { status: 404, headers });
    }

    const { session } = await getOrCreateAnonymousSession();
    const request = await createManualPaymentRequest({
      anonymousSessionId: session.id,
      planId,
      contactMethod: parseContactMethod(body?.contactMethod),
      contactValue: typeof body?.contactValue === "string" ? body.contactValue : null,
      message: typeof body?.message === "string" ? body.message : null,
      pageUrl: typeof body?.pageUrl === "string" ? body.pageUrl : null,
    });

    return json({ data: request }, { status: 201, headers });
  } catch (error) {
    if (error instanceof RedeemCodeError) {
      return json({ error: error.message, code: error.code }, { status: error.status, headers });
    }
    return json({ error: "failed_to_create_payment_request" }, { status: 500, headers });
  }
}

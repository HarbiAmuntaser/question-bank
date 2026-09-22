import "server-only";
import { headers } from "next/headers";
import { authOrigin } from "@/lib/server/auth-config";
import { consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { PaymentError } from "@/lib/server/payment-scope";

export async function protectPaymentAdminAction(actorId: string, write = true) {
  const requestHeaders = await headers();
  if (requestHeaders.get("origin") !== authOrigin() || ["cross-site", "same-site"].includes(requestHeaders.get("sec-fetch-site") ?? "")) {
    throw new PaymentError("forbidden", 403);
  }
  const mode = write ? "write" : "read";
  await consumeAuthLimit("payment-admin-action:ip:" + mode, requestIdentity(requestHeaders), 120, write ? 900 : 60);
  await consumeAuthLimit("payment-admin-action:actor:" + mode, actorId, write ? 60 : 120, write ? 900 : 60);
}

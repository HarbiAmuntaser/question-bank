import { safeCallbackPath } from "@/lib/auth-policy";

export const SUBSCRIPTION_RETURN_PARAM = "continueAccess";

export function subscriptionReturnKey(kind: "quiz" | "summary" | "chapter-attachment" | "subject", id: string) {
  const normalized = id.trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(normalized)) return null;
  return `${kind}:${normalized}`;
}

export function callbackWithSubscriptionReturn(path: string, returnKey: string | null | undefined) {
  const safePath = safeCallbackPath(path);
  if (!returnKey || !/^(quiz|summary|chapter-attachment|subject):[a-zA-Z0-9_-]{1,100}$/.test(returnKey)) return safePath;
  const url = new URL(safePath, "https://callback.invalid");
  url.searchParams.set(SUBSCRIPTION_RETURN_PARAM, returnKey);
  return safeCallbackPath(url.pathname + url.search);
}

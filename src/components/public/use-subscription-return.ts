"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SUBSCRIPTION_RETURN_PARAM } from "@/lib/subscription-return";

export function useSubscriptionReturn(
  matches: (value: string) => boolean,
  ready: boolean,
  onReturn: (value: string) => void,
) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const marker = url.searchParams.get(SUBSCRIPTION_RETURN_PARAM);
    if (!ready || !marker || !matches(marker)) return;
    onReturn(marker);
    url.searchParams.delete(SUBSCRIPTION_RETURN_PARAM);
    router.replace(pathname + (url.searchParams.size ? `?${url.searchParams}` : ""), { scroll: false });
  }, [matches, onReturn, pathname, ready, router]);
}

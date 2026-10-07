"use client";

import { useEffect, useRef } from "react";

import { useAdsContext } from "@/components/ads/ads-provider";
import type { ManualAdPlacement } from "@/lib/adsense/eligibility";

type AdsWindow = Window & {
  adsbygoogle?: Record<string, unknown>[];
};

export function AdSlot({
  slotId,
  placement,
  className,
}: {
  slotId: string;
  placement: ManualAdPlacement;
  className?: string;
}) {
  const context = useAdsContext();
  const requestedRef = useRef(false);
  const allowed = Boolean(
    context?.canLoad &&
      context.runtime.clientId &&
      context.decision.manualPlacements.includes(placement) &&
      /^\d+$/.test(slotId),
  );

  useEffect(() => {
    if (!allowed || requestedRef.current) return;
    requestedRef.current = true;
    const adsWindow = window as AdsWindow;
    adsWindow.adsbygoogle = adsWindow.adsbygoogle ?? [];
    adsWindow.adsbygoogle.push({});
  }, [allowed]);

  if (!allowed || !context?.runtime.clientId) return null;

  return (
    <ins
      className={["adsbygoogle block", className].filter(Boolean).join(" ")}
      data-ad-client={context.runtime.clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

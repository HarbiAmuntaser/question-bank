"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import Script from "next/script";

import {
  canLoadAdSense,
  type AdsEligibilityDecision,
} from "@/lib/adsense/eligibility";

export type AdsProviderRuntime = {
  enabled: boolean;
  clientId: string | null;
};

type AdsContextValue = {
  decision: AdsEligibilityDecision;
  runtime: AdsProviderRuntime;
  canLoad: boolean;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdSenseLoader() {
  const context = useContext(AdsContext);
  if (!context?.canLoad || !context.runtime.clientId) return null;

  return (
    <Script
      id="mustawak-adsense"
      async
      crossOrigin="anonymous"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(context.runtime.clientId)}`}
    />
  );
}

export function AdsProvider({
  children,
  decision,
  runtime,
}: {
  children: ReactNode;
  decision: AdsEligibilityDecision;
  runtime: AdsProviderRuntime;
}) {
  const canLoad = canLoadAdSense(decision, runtime);
  const value = useMemo(
    () => ({ decision, runtime, canLoad }),
    [canLoad, decision, runtime],
  );

  return (
    <AdsContext.Provider value={value}>
      {children}
      <AdSenseLoader />
    </AdsContext.Provider>
  );
}

export function useAdsContext() {
  return useContext(AdsContext);
}

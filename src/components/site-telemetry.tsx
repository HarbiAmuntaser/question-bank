"use client";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

function protectAuthUrls<T extends { url: string }>(event: T): T | null {
  try {
    const url = new URL(event.url, window.location.origin);
    if (/^\/(auth|account|admin\/(payment-orders|subscriptions))(\/|$)/.test(url.pathname) || url.searchParams.has("token")) return null;
    return event;
  } catch { return null; }
}

export function SiteTelemetry() {
  const pathname = usePathname();
  if (/^\/(auth|account|admin\/(payment-orders|subscriptions))(\/|$)/.test(pathname ?? "")) return null;
  // Loaded analytics scripts may survive a client-side navigation into auth.
  return <><SpeedInsights beforeSend={protectAuthUrls} /><Analytics beforeSend={protectAuthUrls} /></>;
}

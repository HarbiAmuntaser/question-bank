import "server-only";

export type AdSenseIdentity = {
  publisherId: `pub-${string}`;
  clientId: `ca-pub-${string}`;
};

export type AdSenseRuntimeConfig = {
  enabled: boolean;
  requestedEnabled: boolean;
  identity: AdSenseIdentity | null;
  reason: "enabled" | "disabled" | "missing_or_invalid_publisher_id";
};

type AdSenseEnvironment = {
  ADSENSE_ENABLED?: string;
  ADSENSE_PUBLISHER_ID?: string;
};

const PUBLISHER_ID_PATTERN = /^pub-(\d{16})$/;

export function parseAdSensePublisherId(raw: string | null | undefined): AdSenseIdentity | null {
  const value = raw?.trim() ?? "";
  const match = PUBLISHER_ID_PATTERN.exec(value);
  if (!match) return null;

  return {
    publisherId: value as AdSenseIdentity["publisherId"],
    clientId: `ca-pub-${match[1]}` as AdSenseIdentity["clientId"],
  };
}

export function getAdSenseRuntimeConfig(
  env: AdSenseEnvironment = process.env as AdSenseEnvironment,
): AdSenseRuntimeConfig {
  const requestedEnabled = env.ADSENSE_ENABLED?.trim() === "true";
  const identity = parseAdSensePublisherId(env.ADSENSE_PUBLISHER_ID);

  if (!requestedEnabled) {
    return { enabled: false, requestedEnabled, identity, reason: "disabled" };
  }
  if (!identity) {
    return {
      enabled: false,
      requestedEnabled,
      identity: null,
      reason: "missing_or_invalid_publisher_id",
    };
  }
  return { enabled: true, requestedEnabled, identity, reason: "enabled" };
}

export function getAdsTxtLine(identity: AdSenseIdentity) {
  return `google.com, ${identity.publisherId}, DIRECT, f08c47fec0942fa0`;
}

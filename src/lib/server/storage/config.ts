import "server-only";

export type R2BucketVisibility = "public" | "private";

export type R2StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicBucket: string;
  privateBucket: string;
  publicBaseUrl: string;
  signedUrlTtlSeconds: number;
};

const REQUIRED_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_PUBLIC_BUCKET",
  "R2_PRIVATE_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "R2_SIGNED_URL_TTL_SECONDS",
] as const;

let cachedConfig: R2StorageConfig | null = null;

export class R2StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2StorageConfigError";
  }
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readEnv() {
  const values = Object.fromEntries(REQUIRED_ENV_KEYS.map((key) => [key, process.env[key]?.trim() ?? ""])) as Record<
    (typeof REQUIRED_ENV_KEYS)[number],
    string
  >;
  const missing = REQUIRED_ENV_KEYS.filter((key) => !values[key]);

  if (missing.length) {
    throw new R2StorageConfigError(`Missing R2 environment variables: ${missing.join(", ")}`);
  }

  return values;
}

function parsePositiveInteger(name: string, value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new R2StorageConfigError(`${name} must be a positive integer.`);
  }
  return parsed;
}

function validateUrl(name: string, value: string) {
  try {
    return stripTrailingSlash(new URL(value).toString());
  } catch {
    throw new R2StorageConfigError(`${name} must be a valid URL.`);
  }
}

export function getR2StorageConfig(): R2StorageConfig {
  if (cachedConfig) return cachedConfig;

  const env = readEnv();
  cachedConfig = {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    endpoint: validateUrl("R2_ENDPOINT", env.R2_ENDPOINT),
    publicBucket: env.R2_PUBLIC_BUCKET,
    privateBucket: env.R2_PRIVATE_BUCKET,
    publicBaseUrl: validateUrl("R2_PUBLIC_BASE_URL", env.R2_PUBLIC_BASE_URL),
    signedUrlTtlSeconds: parsePositiveInteger("R2_SIGNED_URL_TTL_SECONDS", env.R2_SIGNED_URL_TTL_SECONDS),
  };

  return cachedConfig;
}

export function getR2BucketName(visibility: R2BucketVisibility) {
  const config = getR2StorageConfig();
  return visibility === "public" ? config.publicBucket : config.privateBucket;
}

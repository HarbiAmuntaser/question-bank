import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2BucketName, getR2StorageConfig, type R2BucketVisibility } from "./config";
import { encodeStorageKeyForUrl, normalizeStorageKey } from "./keys";

type R2BucketTarget =
  | {
      bucket: string;
      visibility?: never;
    }
  | {
      bucket?: never;
      visibility: R2BucketVisibility;
    };

type PresignedUrlInput = R2BucketTarget & {
  storageKey: string;
  expiresInSeconds?: number;
};

type PresignedPutUrlInput = PresignedUrlInput & {
  contentType?: string | null;
};

type PutObjectInput = R2BucketTarget & {
  storageKey: string;
  body: PutObjectCommandInput["Body"];
  contentType?: string | null;
  cacheControl?: string | null;
  metadata?: Record<string, string>;
};

type DeleteObjectInput = R2BucketTarget & {
  storageKey: string;
};

let cachedClient: S3Client | null = null;

function getR2Client() {
  if (cachedClient) return cachedClient;

  const config = getR2StorageConfig();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

function resolveBucket(input: R2BucketTarget) {
  return input.bucket ?? getR2BucketName(input.visibility);
}

function signedUrlTtl(input?: number) {
  return input ?? getR2StorageConfig().signedUrlTtlSeconds;
}

export function buildPublicR2Url(storageKey: string) {
  const config = getR2StorageConfig();
  return `${config.publicBaseUrl}/${encodeStorageKeyForUrl(storageKey)}`;
}

export async function createPresignedGetUrl(input: PresignedUrlInput) {
  const command = new GetObjectCommand({
    Bucket: resolveBucket(input),
    Key: normalizeStorageKey(input.storageKey),
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: signedUrlTtl(input.expiresInSeconds),
  });
}

export async function createPresignedPutUrl(input: PresignedPutUrlInput) {
  const command = new PutObjectCommand({
    Bucket: resolveBucket(input),
    Key: normalizeStorageKey(input.storageKey),
    ContentType: input.contentType ?? undefined,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: signedUrlTtl(input.expiresInSeconds),
  });
}

export async function putObjectToR2(input: PutObjectInput) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: resolveBucket(input),
      Key: normalizeStorageKey(input.storageKey),
      Body: input.body,
      ContentType: input.contentType ?? undefined,
      CacheControl: input.cacheControl ?? undefined,
      Metadata: input.metadata,
    }),
  );
}

export async function deleteObjectFromR2(input: DeleteObjectInput) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: resolveBucket(input),
      Key: normalizeStorageKey(input.storageKey),
    }),
  );
}

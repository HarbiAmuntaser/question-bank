import "server-only";

import { randomUUID } from "crypto";

export type StorageKeyFolder = "blog/covers" | "blog/inline" | "summaries/pdfs" | "attachments";

const EXTENSION_PATTERN = /\.[a-z0-9]{1,12}$/i;

function padMonth(value: number) {
  return String(value).padStart(2, "0");
}

function safeSegment(value: string, fallback: string) {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/\.\.+/g, ".")
    .replace(/[^a-zA-Z0-9\u0600-\u06ff._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
}

export function normalizeStorageKey(value: string) {
  const parts = value
    .split("/")
    .map((part) => safeSegment(part, "file"))
    .filter((part) => part !== "." && part !== "..");

  if (!parts.length) {
    throw new Error("storageKey must not be empty.");
  }

  return parts.join("/");
}

export function sanitizeFileName(fileName: string, fallback = "file") {
  const baseName = fileName.split(/[\\/]/).pop()?.trim() || fallback;
  const extension = baseName.match(EXTENSION_PATTERN)?.[0]?.toLowerCase() ?? "";
  const stem = extension ? baseName.slice(0, -extension.length) : baseName;
  const safeStem = safeSegment(stem, fallback);
  return `${safeStem}${extension}`;
}

export function buildDatedStorageKey(input: {
  folder: StorageKeyFolder;
  fileName: string;
  now?: Date;
  suffix?: string;
}) {
  const now = input.now ?? new Date();
  const safeName = sanitizeFileName(input.fileName);
  const extension = safeName.match(EXTENSION_PATTERN)?.[0] ?? "";
  const stem = extension ? safeName.slice(0, -extension.length) : safeName;
  const suffix = safeSegment(input.suffix ?? randomUUID(), "file");

  return normalizeStorageKey(
    [
      input.folder,
      String(now.getUTCFullYear()),
      padMonth(now.getUTCMonth() + 1),
      `${stem}-${suffix}${extension}`,
    ].join("/"),
  );
}

export function encodeStorageKeyForUrl(storageKey: string) {
  return normalizeStorageKey(storageKey)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

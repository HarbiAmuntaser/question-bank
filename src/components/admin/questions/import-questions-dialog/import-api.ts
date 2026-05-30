import type { DuplicateStrategy, NormalizedImportItem } from "./types";
import { isRecord } from "./import-parser";

function getApiErrorMessage(data: unknown) {
  if (!isRecord(data)) return "فشل الاستيراد";
  const message = data.message ?? data.error;
  return typeof message === "string" ? message : "فشل الاستيراد";
}

export function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function toImportPayloadItems(items: NormalizedImportItem[]) {
  return items.map(({ sourceIndex, ...item }) => {
    void sourceIndex;
    return item;
  });
}

export async function importChunk(chapterId: string, items: NormalizedImportItem[], duplicateStrategy: DuplicateStrategy) {
  const res = await fetch("/api/v1/admin/questions/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chapterId, items: toImportPayloadItems(items), duplicateStrategy }),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error(getApiErrorMessage(data));
  return {
    imported: isRecord(data) && typeof data.imported === "number" ? data.imported : items.length,
    skipped: isRecord(data) && typeof data.skipped === "number" ? data.skipped : 0,
  };
}

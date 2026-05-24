export type StudentApiSuccess<T> = { data: T };
export type StudentApiError = { error?: string; message?: string; details?: unknown };

export async function studentGet<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    ...init,
    method: "GET",
    // ملاحظة: Client Components لا تستفيد من next: { revalidate }، نعتمد على cache-control من الراوتر.
    headers: { ...(init?.headers ?? {}), "accept": "application/json" },
    signal,
    cache: "default",
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // تجاهل
  }

  if (!res.ok) {
    const err = (json as StudentApiError) ?? {};
    const msg = err.message || err.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // معظم الراوترات ترجع { data: ... }
  const payload = json as StudentApiSuccess<T> | T;
  // دعم كلا النمطين (مرن)
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as StudentApiSuccess<T>).data;
  }
  return payload as T;
}
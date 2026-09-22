// src/app/admin/seo-meta/actions.ts
"use server"
import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";

type SortableColumn = "updatedAt" | "createdAt" | "slug"

function pickErrorMessage(data: any, fallback: string) {
  return data?.error ?? data?.message ?? fallback
}

export async function listSeoMetaAction(args: {
  ownerType?: string
  ownerId?: string
  locale?: string
  query?: string
  page?: number
  pageSize?: number
  sortBy?: SortableColumn
  sortOrder?: "asc" | "desc"
}) {
  await requireAdminPermission("seo-meta:read");

  const params = new URLSearchParams()
  if (args.ownerType) params.set("ownerType", args.ownerType)
  if (args.ownerId) params.set("ownerId", args.ownerId)
  if (args.locale) params.set("locale", args.locale)
  if (args.query) params.set("query", args.query)
  params.set("page", String(args.page ?? 1))
  params.set("pageSize", String(args.pageSize ?? 20))
  params.set("sortBy", args.sortBy ?? "updatedAt")
  params.set("sortOrder", args.sortOrder ?? "desc")

  const res = await apiFetch(`/api/v1/admin/seo-meta?${params.toString()}`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) return { success: false, message: pickErrorMessage(data, "فشل تحميل بيانات SEO") }
  return { success: true, ...data }
}

export async function getSeoMetaByIdAction(id: string) {
  await requireAdminPermission("seo-meta:read");

  const res = await apiFetch(`/api/v1/admin/seo-meta/${id}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, message: pickErrorMessage(data, "فشل تحميل بيانات السجل") }
  return { success: true, data: data?.data }
}

// src/app/admin/seo-meta/actions.ts

export async function createSeoMetaAction(payload: any) {
  await requireAdminPermission("seo-meta:write");

  const res = await apiFetch(`/api/v1/admin/seo-meta`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      message: pickErrorMessage(data, "فشل إنشاء بيانات SEO"),
      details: data?.details, // ✅ NEW
    };
  }

  return {
    success: true,
    data: data?.data,
    message: data?.message ?? "تم إنشاء بيانات SEO",
  };
}

export async function updateSeoMetaAction(id: string, payload: any) {
  await requireAdminPermission("seo-meta:write");

  const res = await apiFetch(`/api/v1/admin/seo-meta/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      message: pickErrorMessage(data, "فشل تحديث بيانات SEO"),
      details: data?.details, // ✅ NEW
    };
  }

  return {
    success: true,
    data: data?.data,
    message: data?.message ?? "تم تحديث بيانات SEO",
  };
}


export async function deleteSeoMetaAction(id: string) {
  await requireAdminPermission("seo-meta:write");

  const res = await apiFetch(`/api/v1/admin/seo-meta/${id}`, { method: "DELETE" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, message: pickErrorMessage(data, "فشل حذف بيانات SEO") }
  return { success: true, message: data?.message ?? "تم حذف بيانات SEO" }
}

// ✅ NEW
export type SeoOwnerType =
  | "university"
  | "major"
  | "subject"
  | "chapter"
  | "exam"
  | "blog_post"
  | "blog_topic"
  | "study_summary"
export type ComboOption = {
  id: string
  label: string
  subLabel?: string
  meta?: string | null
  slug?: string | null
  slugMissing?: boolean
}

// =========================
// existing helpers (as-is)
// =========================

// =========================
// ✅ NEW: Owners actions
// =========================
export async function listSeoOwnersAction(args: {
  type: SeoOwnerType
  query?: string
  universityId?: string
  majorId?: string
  subjectId?: string
}) {
  await requireAdminPermission("seo-meta:read");

  const params = new URLSearchParams()
  params.set("type", args.type)
  if (args.query) params.set("query", args.query)
  if (args.universityId) params.set("universityId", args.universityId)
  if (args.majorId) params.set("majorId", args.majorId)
  if (args.subjectId) params.set("subjectId", args.subjectId)

  const res = await apiFetch(`/api/v1/admin/seo-meta/owners?${params.toString()}`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return {
      success: false,
      message: data?.error ?? data?.message ?? "failed_to_load_owners",
      data: [] as ComboOption[],
    }
  }

  return { success: true, data: (data?.data ?? []) as ComboOption[] }
}

export async function resolveSeoOwnerAction(args: { type: SeoOwnerType; id: string }) {
  await requireAdminPermission("seo-meta:read");

  const params = new URLSearchParams()
  params.set("mode", "resolve")
  params.set("type", args.type)
  params.set("id", args.id)

  const res = await apiFetch(`/api/v1/admin/seo-meta/owners?${params.toString()}`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return { success: false, message: data?.error ?? data?.message ?? "failed_to_resolve_owner", data: null }
  }

  return { success: true, data: data?.data ?? null }
}

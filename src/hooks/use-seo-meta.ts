// src/hooks/use-seo-meta.ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  listSeoMetaAction,
  createSeoMetaAction,
  updateSeoMetaAction,
  deleteSeoMetaAction,
} from "@/app/admin/seo-meta/actions"

export function useSeoMetaList(initialFilters?: {
  ownerType?: string
  ownerId?: string
  locale?: string
  query?: string
}, initialData?: { rows: any[]; pagination?: any }) {
  const [filters, setFilters] = useState({
    ownerType: initialFilters?.ownerType ?? "",
    ownerId: initialFilters?.ownerId ?? "",
    locale: initialFilters?.locale ?? "",
    query: initialFilters?.query ?? "",
    page: 1,
    pageSize: 20,
    sortBy: "updatedAt" as "updatedAt" | "createdAt" | "slug",
    sortOrder: "desc" as "asc" | "desc",
  })
  const skipInitialLoad = useRef(Boolean(initialData))
  const [loading, setLoading] = useState(initialData === undefined)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ rows: any[]; pagination?: any }>(initialData ?? { rows: [] })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await listSeoMetaAction({
      ownerType: filters.ownerType.trim() ? filters.ownerType : undefined,
      ownerId: filters.ownerId.trim() ? filters.ownerId : undefined,
      locale: filters.locale.trim() ? filters.locale : undefined,
      query: filters.query.trim() ? filters.query : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    })
    if (!res.success) {
      setError(res.message ?? "فشل تحميل بيانات SEO")
      setData({ rows: [] })
    } else {
      setData({ rows: res.data ?? [], pagination: res.pagination })
    }
    setLoading(false)
  }, [filters])

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false
      return
    }
    load()
  }, [load])

  return {
    filters,
    setFilters,
    loading,
    error,
    rows: data.rows,
    pagination: data.pagination,
    reload: load,
  }
}

export function useSeoMetaMutations() {
  const create = useCallback(async (payload: any) => {
    return await createSeoMetaAction(payload)
  }, [])

  const update = useCallback(async (id: string, payload: any) => {
    return await updateSeoMetaAction(id, payload)
  }, [])

  const remove = useCallback(async (id: string) => {
    return await deleteSeoMetaAction(id)
  }, [])

  return { create, update, remove }
}

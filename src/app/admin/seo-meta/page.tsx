// src/app/admin/seo-meta/page.tsx
"use client"

import { useState } from "react"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useSeoMetaList } from "@/hooks/use-seo-meta"
import { SeoMetaDialog } from "@/components/admin/seo/SeoMetaDialog"

// ✅ الجديد: فلتر اختيار المالك بدل إدخال ownerId
import { SeoOwnerSelector } from "@/components/admin/seo/SeoOwnerSelector"

const ownerTypeOptions = [
  { value: "all", label: "كل الأنواع" },
  { value: "university", label: "جامعة" },
  { value: "major", label: "تخصص" },
  { value: "subject", label: "مقرر" },
  { value: "chapter", label: "وحدة" },
  { value: "exam", label: "امتحان" },
]

const localeOptions = [
  { value: "all", label: "كل اللغات" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
]

export default function SeoMetaPage() {
  const { filters, setFilters, loading, error, rows, pagination, reload } = useSeoMetaList()

  const [queryInput, setQueryInput] = useState(filters.query)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)

  function applyFilters() {
    setFilters((prev) => ({ ...prev, query: queryInput, page: 1 }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>سجل بيانات SEO</CardTitle>
          <CardDescription>نظرة عامة على ميتا البيانات للأقسام المختلفة.</CardDescription>
        </CardHeader>

        {/* ✅ عدلنا توزيع الأعمدة ليتسع للـ Selector */}
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium text-muted-foreground">نوع المالك</label>
            <Select
              value={filters.ownerType || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  ownerType: value === "all" ? "" : value,
                  ownerId: "", // ✅ مهم: امسح المالك عند تغيير النوع
                  page: 1,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="نوع المالك" />
              </SelectTrigger>
              <SelectContent>
                {ownerTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium text-muted-foreground">اللغة</label>
            <Select
              value={filters.locale || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  locale: value === "all" ? "" : value,
                  page: 1,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اللغة" />
              </SelectTrigger>
              <SelectContent>
                {localeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ✅ فلتر اختيار المالك */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">اختيار المالك</label>

            {filters.ownerType ? (
              <SeoOwnerSelector
                ownerType={filters.ownerType}
                ownerId={filters.ownerId}
                onOwnerTypeChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    ownerType: v,
                    ownerId: "",
                    page: 1,
                  }))
                }
                onOwnerIdChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    ownerId: v,
                    page: 1,
                  }))
                }
                // ✅ هنا نغلق تغيير النوع داخل الـ Selector لأن النوع يتحكم به فلتر "نوع المالك"
                lockOwnerType={true}
                lockOwnerId={false}
              />
            ) : (
              <div className="h-10 flex items-center text-sm text-muted-foreground">
                اختر نوع المالك أولاً لعرض خيارات التحديد.
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">البحث</label>
            <div className="flex gap-2">
              <Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="بحث عام" />
              <Button onClick={applyFilters}>تصفية</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>نتائج البحث</CardTitle>
            <CardDescription>يعرض آخر السجلات المحدثة.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={reload}>
              تحديث
            </Button>
            <Button onClick={() => setDialogOpen(true)}>إضافة SEO</Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">لا توجد بيانات.</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="py-3 text-left">المعرف</th>
                  <th className="py-3 text-left">النوع</th>
                  <th className="py-3 text-left">اللغة</th>
                  <th className="py-3 text-left">Slug</th>
                  <th className="py-3 text-left">العنوان</th>
                  <th className="py-3 text-left">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">{row.id}</td>
                    <td className="py-3 capitalize">{row.ownerType}</td>
                    <td className="py-3 uppercase">{row.locale}</td>
                    <td className="py-3">{row.slug}</td>
                    <td className="py-3">{row.metaTitle ?? "-"}</td>
                    <td className="py-3 arabic-numbers">
                      {new Date(row.updatedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 text-left space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRecord(row)
                          setDialogOpen(true)
                        }}
                      >
                        تعديل
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>

        {pagination && rows.length > 0 && (
          <div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              الصفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total})
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination || filters.page >= pagination.totalPages}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: pagination ? Math.min(pagination.totalPages, prev.page + 1) : prev.page + 1,
                  }))
                }
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </Card>

      <SeoMetaDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next) setEditingRecord(null)
          setDialogOpen(next)
        }}
        ownerType={editingRecord?.ownerType ?? "major"}
        ownerId={editingRecord?.ownerId ?? ""}
        initialData={editingRecord ?? undefined}
        onSaved={reload}
        lockOwner={false}
      />
    </div>
  )
}

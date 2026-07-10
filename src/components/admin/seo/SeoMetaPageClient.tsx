"use client";

import { useState } from "react";

import { SeoMetaDialog } from "@/components/admin/seo/SeoMetaDialog";
import { SeoOwnerSelector } from "@/components/admin/seo/SeoOwnerSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useSeoMetaList } from "@/hooks/use-seo-meta";

type SeoMetaRow = {
  id: string;
  ownerType: string;
  ownerId: string;
  locale: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  schemaJson?: unknown;
  createdAt: string;
  updatedAt: string;
};

type InitialData = {
  rows: SeoMetaRow[];
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
};

const ownerTypeOptions = [
  { value: "all", label: "كل الأنواع" },
  { value: "university", label: "جامعة" },
  { value: "major", label: "تخصص" },
  { value: "subject", label: "مقرر" },
  { value: "chapter", label: "وحدة" },
  { value: "exam", label: "امتحان" },
  { value: "blog_post", label: "مقال مدونة" },
  { value: "blog_topic", label: "موضوع مدونة" },
  { value: "study_summary", label: "ملخص دراسي" },
];

const localeOptions = [
  { value: "all", label: "كل اللغات" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

function ownerTypeLabel(value: string) {
  return ownerTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function SeoMetaPageClient({ initialData }: { initialData: InitialData }) {
  const { filters, setFilters, loading, error, rows, pagination, reload } = useSeoMetaList(undefined, initialData);

  const [queryInput, setQueryInput] = useState(filters.query);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SeoMetaRow | null>(null);

  function applyFilters() {
    setFilters((prev) => ({ ...prev, query: queryInput, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>سجل بيانات SEO</CardTitle>
          <CardDescription>نظرة عامة على ميتا البيانات للأقسام المختلفة.</CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium text-muted-foreground">نوع المالك</label>
            <Select
              value={filters.ownerType || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  ownerType: value === "all" ? "" : value,
                  ownerId: "",
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
                lockOwnerType
                lockOwnerId={false}
              />
            ) : (
              <div className="flex h-10 items-center text-sm text-muted-foreground">
                اختر نوع المالك أولاً لعرض خيارات التحديد.
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">البحث</label>
            <div className="flex flex-col gap-2 sm:flex-row">
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 text-right">المعرف</th>
                    <th className="py-3 text-right">النوع</th>
                    <th className="py-3 text-right">اللغة</th>
                    <th className="py-3 text-right">Slug</th>
                    <th className="py-3 text-right">العنوان</th>
                    <th className="py-3 text-right">آخر تحديث</th>
                    <th className="py-3 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: SeoMetaRow) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 font-mono text-xs" dir="ltr">
                        {row.id}
                      </td>
                      <td className="py-3">{ownerTypeLabel(row.ownerType)}</td>
                      <td className="py-3 uppercase">{row.locale}</td>
                      <td className="py-3">{row.slug}</td>
                      <td className="py-3">{row.metaTitle ?? "-"}</td>
                      <td className="arabic-numbers py-3">
                        {new Date(row.updatedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="space-x-2 py-3 text-left">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="تعديل بيانات SEO"
                          onClick={() => {
                            setEditingRecord(row);
                            setDialogOpen(true);
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
          if (!next) setEditingRecord(null);
          setDialogOpen(next);
        }}
        ownerType={editingRecord?.ownerType ?? (filters.ownerType || "major")}
        ownerId={editingRecord?.ownerId ?? filters.ownerId ?? ""}
        initialData={editingRecord ?? undefined}
        onSaved={reload}
        lockOwner={false}
      />
    </div>
  );
}

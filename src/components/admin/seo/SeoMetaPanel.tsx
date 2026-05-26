// src/components/admin/seo/SeoMetaPanel.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { deleteSeoMetaAction } from "@/app/admin/seo-meta/actions"
import { SeoMetaDialog } from "./SeoMetaDialog"
import { AdminTableShell } from "@/components/admin/admin-table-shell"

type SeoMetaRecord = {
  id: string
  ownerType: string
  ownerId: string
  locale: string
  slug: string
  metaTitle?: string | null
  updatedAt: string
}

export function SeoMetaPanel({
  ownerType,
  ownerId,
  rows,
  onChanged,
  allowOwnerChange = false,
}: {
  ownerType: string
  ownerId: string
  rows: SeoMetaRecord[]
  onChanged: () => void
  allowOwnerChange?: boolean
}) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SeoMetaRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(row: SeoMetaRecord) {
    setEditing(row)
    setDialogOpen(true)
  }

  async function handleDelete(row: SeoMetaRecord) {
    if (!confirm("هل ترغب بحذف هذه البيانات؟")) return
    setIsDeleting(row.id)
    const res = await deleteSeoMetaAction(row.id)
    setIsDeleting(null)
    if (!res.success) {
      toast({ title: "خطأ", description: res.message, variant: "destructive" })
      return
    }
    toast({ title: "تم الحذف", description: res.message })
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>بيانات SEO</CardTitle>
          <CardDescription>تحكم بعناصر الميتا لهذا العنصر</CardDescription>
        </div>
        <Button onClick={openCreate}>إضافة SEO</Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</div>
        ) : (
          <AdminTableShell minWidth="min-w-[760px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اللغة</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline">{row.locale.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{row.slug}</TableCell>
                    <TableCell>{row.metaTitle ?? "-"}</TableCell>
                    <TableCell className="arabic-numbers">
                      {new Date(row.updatedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-left space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={isDeleting === row.id}
                        onClick={() => handleDelete(row)}
                      >
                        حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>
        )}
      </CardContent>

      <SeoMetaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ownerType={allowOwnerChange ? editing?.ownerType ?? ownerType : ownerType}
        ownerId={allowOwnerChange ? editing?.ownerId ?? ownerId : ownerId}
        initialData={editing ?? undefined}
        onSaved={onChanged}
        lockOwner={!allowOwnerChange}
      />
    </Card>
  )
}

"use client";

import { useState } from "react";

import { deleteSeoMetaAction } from "@/app/admin/seo-meta/actions";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

import { SeoMetaDialog } from "./SeoMetaDialog";

type SeoMetaRecord = {
  id: string;
  ownerType: string;
  ownerId: string;
  locale: string;
  slug: string;
  metaTitle?: string | null;
  updatedAt: string;
};

export function SeoMetaPanel({
  ownerType,
  ownerId,
  rows,
  onChanged,
  allowOwnerChange = false,
}: {
  ownerType: string;
  ownerId: string;
  rows: SeoMetaRecord[];
  onChanged: () => void;
  allowOwnerChange?: boolean;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SeoMetaRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeoMetaRecord | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: SeoMetaRecord) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleteTarget(null);
    setIsDeleting(row.id);
    const res = await deleteSeoMetaAction(row.id);
    setIsDeleting(null);
    if (!res.success) {
      toast({ title: "خطأ", description: res.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحذف", description: res.message });
    onChanged();
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
                    <TableCell className="space-x-2 text-left">
                      <Button variant="ghost" size="sm" aria-label="تعديل بيانات SEO" onClick={() => openEdit(row)}>
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={isDeleting === row.id}
                        aria-label="حذف بيانات SEO"
                        onClick={() => setDeleteTarget(row)}
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف بيانات SEO؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه البيانات من لوحة الإدارة. لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";

import { deleteUserAction, listUsersAction } from "@/app/admin/users/actions";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/hooks/use-toast";

import UserDialog from "./UserDialog";

type Role = "admin" | "editor" | "moderator";
type Row = { id: string; name: string | null; email: string; role: Role; isActive: boolean; createdAt: Date | string };

export default function UsersTable({ initialRows }: { initialRows?: Row[] }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(initialRows === undefined);
  const [rows, setRows] = useState<Row[]>(initialRows ?? []);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await listUsersAction();
    if (r.success) {
      setRows(r.users ?? []);
    } else {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (initialRows === undefined) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    const r = await deleteUserAction(id);
    if (r.success) {
      toast({ title: "تم الحذف", description: r.message });
      void load();
    } else {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-medium">المستخدمون</div>
        <UserDialog onDone={load}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden /> مستخدم جديد
          </Button>
        </UserDialog>
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    لا يوجد مستخدمون
                  </TableCell>
                </TableRow>
              )}
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name || <span className="text-muted-foreground">بدون اسم</span>}</TableCell>
                  <TableCell className="arabic-numbers" dir="ltr">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "نشط" : "غير نشط"}</Badge>
                  </TableCell>
                  <TableCell className="arabic-numbers text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-2">
                      <UserDialog user={u} onDone={load}>
                        <Button variant="ghost" size="sm" title="تعديل" aria-label="تعديل المستخدم">
                          <Edit className="h-4 w-4" aria-hidden />
                        </Button>
                      </UserDialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="حذف"
                        aria-label="حذف المستخدم"
                        onClick={() => setDeleteId(u.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المستخدم من لوحة الإدارة. لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

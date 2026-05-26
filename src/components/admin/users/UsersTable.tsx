"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { listUsersAction, deleteUserAction } from "@/app/admin/users/actions";
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import UserDialog from "./UserDialog";

type Role = "admin" | "editor" | "moderator";
type Row = { id: string; name: string | null; email: string; role: Role; isActive: boolean; createdAt: string };

export default function UsersTable() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [editUser, setEditUser] = useState<Row | undefined>(undefined);

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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا المستخدم؟")) return;
    const r = await deleteUserAction(id);
    if (r.success) {
      toast({ title: "تم الحذف", description: r.message });
      load();
    } else {
      toast({ title: "خطأ", description: r.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex flex-col gap-3 p-4 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="font-medium">المستخدمون</div>
        <UserDialog onDone={load}>
          <Button className="gap-2"><Plus className="h-4 w-4" /> مستخدم جديد</Button>
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
          {!loading && rows.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا يوجد مستخدمون</TableCell></TableRow>
          )}
          {rows.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.name || <span className="text-muted-foreground">بدون اسم</span>}</TableCell>
              <TableCell className="arabic-numbers">{u.email}</TableCell>
              <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
              <TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "نشط" : "غير نشط"}</Badge></TableCell>
              <TableCell className="arabic-numbers text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("ar-SA")}</TableCell>
              <TableCell className="text-left">
                <div className="flex gap-2">
                  <UserDialog user={u} onDone={load}>
                    <Button variant="ghost" size="sm" title="تعديل"><Edit className="h-4 w-4" /></Button>
                  </UserDialog>
                  <Button variant="ghost" size="sm" title="حذف" onClick={() => onDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
        </div>
      )}
    </div>
  );
}

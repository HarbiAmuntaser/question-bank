"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createUserAction, updateUserAction } from "@/app/admin/users/actions";

type Role = "admin" | "editor" | "moderator";
type UserRow = {
  id: string; name: string | null; email: string; role: Role; isActive: boolean;
};

export default function UserDialog({
  children,
  user,
  onDone,
}: {
  children?: React.ReactNode;
  user?: UserRow;
  onDone?: () => void;
}) {
  const isEdit = Boolean(user);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [name, setName] = useState<string>(user?.name ?? "");
  const [email, setEmail] = useState<string>(user?.email ?? "");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<Role>(user?.role ?? "admin");
  const [isActive, setIsActive] = useState<boolean>(user?.isActive ?? true);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.isActive);
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setRole("admin");
      setIsActive(true);
      setPassword("");
    }
  }, [user, open]);

  const submit = () => {
    start(async () => {
      if (isEdit) {
        const r = await updateUserAction(user!.id, {
          name: name || null,
          email,
          role,
          isActive,
          ...(password ? { password } : {}),
        });
        if (r.success) {
          toast({ title: "تم الحفظ", description: r.message });
          setOpen(false);
          onDone?.();
        } else {
          toast({ title: "خطأ", description: r.message, variant: "destructive" });
        }
      } else {
        const r = await createUserAction({
          name: name || null, email, password, role, isActive,
        });
        if (r.success) {
          toast({ title: "تم الإنشاء", description: r.message });
          setOpen(false);
          onDone?.();
        } else {
          toast({ title: "خطأ", description: r.message, variant: "destructive" });
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل مستخدم" : "إنشاء مستخدم"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="اختياري" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">البريد</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isEdit ? "كلمة المرور (اتركها فارغة إن لم تُغيّر)" : "كلمة المرور"}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? "اختياري" : ""} />
          </div>

          <div className="space-y-2">
            <Label>الصلاحية</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} id="isActive" />
            <Label htmlFor="isActive">نشط</Label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>{pending ? "جاري الحفظ..." : (isEdit ? "حفظ" : "إنشاء")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

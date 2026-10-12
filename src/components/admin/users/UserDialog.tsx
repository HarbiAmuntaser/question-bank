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
import {
  AdminFieldError,
  AdminFormErrorSummary,
  normalizeAdminFormErrors,
  useAdminFormValidation,
} from "@/components/admin/admin-form-validation";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-policy";

type Role = "admin" | "editor" | "moderator" | "student";
type UserRow = {
  id: string; name: string | null; email: string; role: Role; isActive: boolean;
};

export default function UserDialog({
  children,
  user,
  isCurrentUser = false,
  onDone,
}: {
  children?: React.ReactNode;
  user?: UserRow;
  isCurrentUser?: boolean;
  onDone?: () => void;
}) {
  const isEdit = Boolean(user);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const validation = useAdminFormValidation("user-form");
  const resetValidation = validation.resetErrors;

  const [name, setName] = useState<string>(user?.name ?? "");
  const [email, setEmail] = useState<string>(user?.email ?? "");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<Role>(user?.role ?? "student");
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
      setRole("student");
      setIsActive(true);
      setPassword("");
    }
    resetValidation();
  }, [user, open, resetValidation]);

  const submit = () => {
    const fieldErrors: Record<string, string> = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "أدخل بريدًا إلكترونيًا صالحًا.";
    if (!isEdit && password.length < PASSWORD_MIN_LENGTH) fieldErrors.password = `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN_LENGTH} حرفًا.`;
    if (password && password.length < PASSWORD_MIN_LENGTH) fieldErrors.password = `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN_LENGTH} حرفًا.`;
    if (Object.keys(fieldErrors).length > 0) {
      validation.reportErrors({ fieldErrors });
      return;
    }

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
          validation.reportErrors(normalizeAdminFormErrors("details" in r ? r.details : undefined, r.message));
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
          validation.reportErrors(normalizeAdminFormErrors("details" in r ? r.details : undefined, r.message));
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

        <form
          id="user-form"
          ref={validation.formRef}
          className="space-y-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <AdminFormErrorSummary message={validation.formError} />
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input id="name" name="name" value={name} onChange={(e) => { setName(e.target.value); validation.clearFieldError("name"); }} placeholder="اختياري" {...validation.getFieldProps("name")} />
            <AdminFieldError id={validation.errorId("name")} message={validation.fieldErrors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">البريد</Label>
            <Input id="email" name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); validation.clearFieldError("email"); }} required {...validation.getFieldProps("email")} />
            <AdminFieldError id={validation.errorId("email")} message={validation.fieldErrors.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isEdit ? "كلمة المرور (اتركها فارغة إن لم تُغيّر)" : "كلمة المرور"}</Label>
            <Input id="password" name="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); validation.clearFieldError("password"); }} placeholder={isEdit ? "اختياري" : ""} {...validation.getFieldProps("password")} />
            <AdminFieldError id={validation.errorId("password")} message={validation.fieldErrors.password} />
          </div>

          <div className="space-y-2">
            <Label>الصلاحية</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isCurrentUser}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">طالب</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} id="isActive" disabled={isCurrentUser} />
            <Label htmlFor="isActive">نشط</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "جاري الحفظ..." : (isEdit ? "حفظ" : "إنشاء")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

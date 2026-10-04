"use client";

import type React from "react";
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, MonitorCog, MonitorX, Power, PowerOff, ShieldX } from "lucide-react";

import {
  changeCodeBrowserLimitAction,
  disableSubscriptionCodeAction,
  enableSubscriptionCodeAction,
  revokeCodeAccessGrantAction,
  revokeCodeAccessSessionAction,
} from "@/app/admin/subscriptions/actions";
import type { CodeRow } from "@/components/admin/subscriptions/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ActionResult = { success: boolean; message: string };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "-";
}

function shortId(value: string | null) {
  return value ? value.slice(0, 8) + "..." + value.slice(-6) : "-";
}

function AdminCodeAction({
  children,
  title,
  description,
  confirmLabel,
  destructive = false,
  requireConfirmation = false,
  run,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  requireConfirmation?: boolean;
  run: (reason: string, idempotencyKey: string) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const key = useRef("");
  const fieldId = useId();
  const router = useRouter();
  const { toast } = useToast();

  function submit() {
    key.current ||= crypto.randomUUID();
    startTransition(async () => {
      setError("");
      const result = await run(reason, key.current);
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast({ title: "تم", description: result.message });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (pending) return;
      setOpen(next);
      setReason("");
      setConfirmed(false);
      setError("");
      key.current = "";
    }}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={fieldId}>السبب الداخلي</Label>
          <Textarea
            id={fieldId}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              key.current = "";
            }}
            minLength={5}
            maxLength={1000}
            rows={3}
            disabled={pending}
          />
        </div>
        {requireConfirmation ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={pending}
              className="mt-1"
            />
            <span>أؤكد تنفيذ هذه العملية وتأثيرها الموضح أعلاه.</span>
          </label>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending || reason.trim().length < 5 || (requireConfirmation && !confirmed)}
            onClick={submit}
          >
            {pending ? "جاري التنفيذ..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BrowserLimitDialog({ code }: { code: CodeRow }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(code.maxBrowserSessions));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const key = useRef("");
  const router = useRouter();
  const { toast } = useToast();
  const activeSessions = code.accessGrant?.sessions.filter((session) => !session.revokedAt).length ?? 0;
  const parsed = Number(value);

  function submit() {
    key.current ||= crypto.randomUUID();
    startTransition(async () => {
      setError("");
      const result = await changeCodeBrowserLimitAction(code.id, parsed, key.current, reason);
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast({ title: "تم", description: result.message });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (pending) return;
      setOpen(next);
      setValue(String(code.maxBrowserSessions));
      setReason("");
      setError("");
      key.current = "";
    }}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={!code.accessGrant}>
          <MonitorCog className="h-4 w-4" aria-hidden />
          حد المتصفحات
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تعديل حد المتصفحات</AlertDialogTitle>
          <AlertDialogDescription>
            الجلسات الفعالة حاليًا: {activeSessions}. لن تُلغى أي جلسة تلقائيًا عند خفض الحد.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="browser-limit">الحد الجديد</Label>
          <Input
            id="browser-limit"
            type="number"
            min={1}
            max={100}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              key.current = "";
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="browser-limit-reason">السبب الداخلي</Label>
          <Textarea
            id="browser-limit-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              key.current = "";
            }}
            minLength={5}
            maxLength={1000}
            rows={3}
          />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !Number.isInteger(parsed) || parsed < 1 || parsed > 100 || parsed < activeSessions || reason.trim().length < 5}
          >
            {pending ? "جاري الحفظ..." : "حفظ الحد"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CodeAccessAdminDialog({ code }: { code: CodeRow }) {
  const grant = code.accessGrant;
  const activeSessions = grant?.sessions.filter((session) => !session.revokedAt) ?? [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="تفاصيل وصول الكود" aria-label="تفاصيل وصول الكود">
          <Eye className="h-4 w-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="text-right">
          <DialogTitle>إدارة وصول الكود</DialogTitle>
          <DialogDescription>
            لا يُعرض الكود السري في لوحة الإدارة. استخدم مرجع الدعم أو المعاينة للبحث والمتابعة.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">المعاينة</dt><dd dir="ltr" className="font-mono">{code.codePreview ?? "-"}</dd></div>
          <div><dt className="text-muted-foreground">مرجع الدعم</dt><dd dir="ltr" className="font-mono">{code.supportReference ?? "-"}</dd></div>
          <div><dt className="text-muted-foreground">حالة الكود</dt><dd><Badge variant={code.isActive ? "default" : "secondary"}>{code.isActive ? "نشط" : "معطل"}</Badge></dd></div>
          <div><dt className="text-muted-foreground">حد المتصفحات</dt><dd>{code.maxBrowserSessions}</dd></div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {code.isActive ? (
            <AdminCodeAction
              title="تعطيل الكود"
              description="سيُمنع First Activation وRecovery وTransfer. لن تُلغى المنحة أو الجلسات الحالية."
              confirmLabel="تعطيل الكود"
              destructive
              run={(reason) => disableSubscriptionCodeAction(code.id, {
                reason,
                expectedUpdatedAt: code.updatedAt,
                confirmContentChange: false,
              })}
            >
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <PowerOff className="h-4 w-4" aria-hidden />
                تعطيل الكود
              </Button>
            </AdminCodeAction>
          ) : (
            <AdminCodeAction
              title="إعادة تفعيل الكود"
              description="سيُسمح مجددًا بالتفعيل أو الاستعادة أو النقل. لن تتغير تواريخ المنحة ولن تُنشأ منحة جديدة."
              confirmLabel="إعادة التفعيل"
              requireConfirmation
              run={(reason) => enableSubscriptionCodeAction(code.id, {
                reason,
                expectedUpdatedAt: code.updatedAt,
                confirmContentChange: true,
              })}
            >
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Power className="h-4 w-4" aria-hidden />
                إعادة التفعيل
              </Button>
            </AdminCodeAction>
          )}
          <BrowserLimitDialog code={code} />
          {grant?.isActive ? (
            <AdminCodeAction
              title="إلغاء منحة الوصول"
              description="سيُوقف الوصول القائم بالكامل فورًا لكل الجلسات المرتبطة بهذه المنحة."
              confirmLabel="إلغاء المنحة"
              destructive
              requireConfirmation
              run={(reason, key) => revokeCodeAccessGrantAction(grant.id, key, reason)}
            >
              <Button type="button" variant="destructive" size="sm" className="gap-2">
                <ShieldX className="h-4 w-4" aria-hidden />
                إلغاء المنحة
              </Button>
            </AdminCodeAction>
          ) : null}
        </div>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">المنحة وصاحب الوصول</h3>
          {!grant ? (
            <p className="text-sm text-muted-foreground">لم يحدث First Activation لهذا الكود بعد.</p>
          ) : (
            <dl className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">النوع</dt><dd>{grant.principalType === "account" ? "حساب طالب" : "ضيف"}</dd></div>
              <div><dt className="text-muted-foreground">الحساب</dt><dd dir="ltr" className="break-all">{grant.userEmail ?? (grant.userId ? shortId(grant.userId) : "-")}</dd></div>
              <div><dt className="text-muted-foreground">البداية</dt><dd>{formatDate(grant.startsAt)}</dd></div>
              <div><dt className="text-muted-foreground">النهاية</dt><dd>{formatDate(grant.expiresAt)}</dd></div>
              <div><dt className="text-muted-foreground">الحالة</dt><dd>{grant.isActive ? "فعالة" : "ملغاة"}</dd></div>
              <div><dt className="text-muted-foreground">الجلسات الفعالة</dt><dd>{activeSessions.length}</dd></div>
            </dl>
          )}
        </section>

        {grant?.principalType === "guest" ? (
          <section className="space-y-3">
            <h3 className="text-base font-semibold">جلسات الضيف</h3>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الجلسة</TableHead><TableHead>الربط</TableHead><TableHead>آخر استخدام</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراء</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {grant.sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell dir="ltr" className="font-mono text-xs">{shortId(session.sessionId)}</TableCell>
                      <TableCell>{formatDate(session.boundAt)}</TableCell>
                      <TableCell>{formatDate(session.lastUsedAt)}</TableCell>
                      <TableCell>{session.revokedAt ? "ملغاة" : "فعالة"}</TableCell>
                      <TableCell>
                        {!session.revokedAt ? (
                          <AdminCodeAction
                            title="إلغاء جلسة محددة"
                            description="سيُلغى Binding هذه المنحة فقط. لن تُلغى GuestAccessSession عالميًا."
                            confirmLabel="إلغاء الجلسة"
                            destructive
                            run={(reason, key) => revokeCodeAccessSessionAction(session.id, key, reason)}
                          >
                            <Button type="button" variant="ghost" size="sm" className="gap-2">
                              <MonitorX className="h-4 w-4" aria-hidden />
                              إلغاء
                            </Button>
                          </AdminCodeAction>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {grant.sessions.length === 0 ? <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">لا توجد جلسات</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-base font-semibold">سجل أحداث الوصول</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الوقت</TableHead><TableHead>الحدث</TableHead><TableHead>المنفذ</TableHead><TableHead>الجلسة</TableHead><TableHead>التفاصيل</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {grant?.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(event.createdAt)}</TableCell>
                    <TableCell dir="ltr">{event.type}</TableCell>
                    <TableCell>{event.actorEmail ?? event.actorType}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{shortId(event.sessionId)}</TableCell>
                    <TableCell><details><summary className="cursor-pointer">عرض</summary><pre dir="ltr" className="max-w-72 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(event.metadata, null, 2)}</pre></details></TableCell>
                  </TableRow>
                ))}
                {!grant || grant.events.length === 0 ? <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">لا توجد أحداث</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          {grant && grant.events.length === 50 ? <p className="text-xs text-muted-foreground">يُعرض أحدث 50 حدثًا.</p> : null}
        </section>
      </DialogContent>
    </Dialog>
  );
}

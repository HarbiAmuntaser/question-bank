import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdminPage } from "@/lib/server/admin-page-auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaymentAdminAction } from "@prisma/client";

export const dynamic = "force-dynamic";
const labels: Record<PaymentAdminAction, string> = {
  plan_created: "إنشاء خطة", plan_updated: "تعديل خطة", plan_disabled: "تعطيل خطة",
  code_issued: "إصدار كود", code_disabled: "تعطيل كود", entitlement_revoked: "تعطيل استحقاق",
};

export default async function PaymentAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage("subscriptions:manage");
  const rawPage = Number((await searchParams).page ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const [rows, redemptions] = await Promise.all([
    prisma.paymentAdminEvent.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 31,
      include: { actor: { select: { name: true, email: true } }, entitlement: { select: { orderItem: { select: { order: { select: { id: true, reference: true } } } } } } } }),
    prisma.paymentCodeRedemptionEvent.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30,
      include: { user: { select: { email: true } }, code: { select: { codePreview: true } }, plan: { select: { title: true } }, subject: { select: { name: true } } } }),
  ]);
  return <div className="space-y-5" dir="rtl">
    <Button asChild variant="ghost"><Link href="/admin/subscriptions"><ArrowRight className="ml-2 h-4 w-4" />الاشتراكات</Link></Button>
    <h1 className="text-2xl font-bold">سجل تدقيق الاشتراكات</h1>
    <AdminTableShell minWidth="min-w-[900px]">
      <Table><TableHeader><TableRow><TableHead>الوقت</TableHead><TableHead>العملية</TableHead><TableHead>الأدمن</TableHead><TableHead>السجل</TableHead><TableHead>السبب الداخلي</TableHead><TableHead>التغيير</TableHead></TableRow></TableHeader>
        <TableBody>{rows.slice(0, 30).map((row) => <TableRow key={row.id}>
          <TableCell className="whitespace-nowrap">{row.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</TableCell>
          <TableCell>{labels[row.action]}</TableCell>
          <TableCell className="max-w-48 break-words">{row.actor.name || row.actor.email}</TableCell>
          <TableCell><span dir="ltr" className="block font-mono text-xs">{row.planId ?? row.codeId ?? row.entitlementId}</span>
            {row.entitlement?.orderItem && <Link className="text-primary underline" href={`/admin/payment-orders/${row.entitlement.orderItem.order.id}`}>{row.entitlement.orderItem.order.reference}</Link>}
          </TableCell>
          <TableCell className="min-w-48 max-w-80 whitespace-pre-wrap break-words">{row.reason}</TableCell>
          <TableCell><details><summary className="cursor-pointer whitespace-nowrap">قبل / بعد</summary><pre dir="ltr" className="max-h-64 max-w-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ before: row.before, after: row.after }, null, 2)}</pre></details></TableCell>
        </TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد عمليات مسجلة</TableCell></TableRow>}</TableBody>
      </Table>
    </AdminTableShell>
    <h2 className="text-xl font-semibold">استردادات الأكواد الناجحة</h2>
    <AdminTableShell minWidth="min-w-[900px]">
      <Table><TableHeader><TableRow><TableHead>الوقت</TableHead><TableHead>الطالب</TableHead><TableHead>الكود</TableHead><TableHead>الخطة</TableHead><TableHead>المادة</TableHead><TableHead>الاستحقاق</TableHead><TableHead>الاستخدام</TableHead></TableRow></TableHeader>
        <TableBody>{redemptions.map((row) => <TableRow key={row.id}>
          <TableCell className="whitespace-nowrap">{row.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</TableCell>
          <TableCell dir="ltr" className="text-xs">{row.user.email}</TableCell><TableCell dir="ltr" className="font-mono text-xs">{row.code.codePreview ?? row.codeId}</TableCell>
          <TableCell>{row.plan.title}</TableCell><TableCell>{row.subject.name}</TableCell>
          <TableCell dir="ltr" className="font-mono text-xs">{row.entitlementId}</TableCell><TableCell>{row.usageNumber}</TableCell>
        </TableRow>)}{redemptions.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">لا توجد استردادات ناجحة</TableCell></TableRow>}</TableBody>
      </Table>
    </AdminTableShell>
    <nav className="flex items-center justify-between gap-3" aria-label="صفحات سجل التدقيق">
      <span className="text-sm text-muted-foreground">الصفحة {page}</span><div className="flex gap-2">
        {page > 1 && <Button asChild variant="outline" size="icon"><Link href={`?page=${page - 1}`} aria-label="السابق" title="السابق"><ChevronRight className="h-4 w-4" /></Link></Button>}
        {rows.length > 30 && page < 10000 && <Button asChild variant="outline" size="icon"><Link href={`?page=${page + 1}`} aria-label="التالي" title="التالي"><ChevronLeft className="h-4 w-4" /></Link></Button>}
      </div>
    </nav>
  </div>;
}

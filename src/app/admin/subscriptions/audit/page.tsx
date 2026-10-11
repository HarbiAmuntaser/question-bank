import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PaymentAdminAction, Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/server/admin-page-auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { AdminContentPathFilters } from "@/components/admin/admin-content-path-filters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  hasPaymentPathFilters,
  paymentPlanPathWhere,
  paymentSubjectPathWhere,
  readPaymentPathFilters,
} from "@/lib/admin/payment-admin-filters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const labels: Record<PaymentAdminAction, string> = {
  plan_created: "إنشاء خطة",
  plan_updated: "تعديل خطة",
  plan_disabled: "تعطيل خطة",
  code_issued: "إصدار كود",
  code_disabled: "تعطيل كود",
  code_enabled: "إعادة تفعيل كود",
  entitlement_revoked: "تعطيل استحقاق",
};

type Params = Record<string, string | string[] | undefined>;
type AuditKind = "admin" | "redemptions";

function first(params: Params, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function paginationHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return "?" + next.toString();
}

export default async function PaymentAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage("subscriptions:manage");
  const params = await searchParams;
  const kind: AuditKind = first(params, "kind") === "redemptions" ? "redemptions" : "admin";
  const rawPage = Number(first(params, "page") || 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const q = first(params, "q").slice(0, 160);
  const requestedAction = first(params, "action");
  const action = Object.values(PaymentAdminAction).includes(requestedAction as PaymentAdminAction)
    ? requestedAction as PaymentAdminAction
    : "";
  const filters = readPaymentPathFilters(params);
  const hasPath = hasPaymentPathFilters(filters);
  const planPath = paymentPlanPathWhere(filters);
  const subjectPath = paymentSubjectPathWhere(filters);

  const adminWhere: Prisma.PaymentAdminEventWhereInput = {
    AND: [
      ...(action ? [{ action }] : []),
      ...(hasPath ? [{ OR: [
        { plan: planPath },
        { code: { plan: planPath } },
        { entitlement: { subject: subjectPath } },
      ] }] : []),
      ...(q ? [{ OR: [
        { reason: { contains: q, mode: "insensitive" as const } },
        { actor: { email: { contains: q, mode: "insensitive" as const } } },
        { actor: { name: { contains: q, mode: "insensitive" as const } } },
        { plan: { title: { contains: q, mode: "insensitive" as const } } },
        { code: { supportReference: { contains: q, mode: "insensitive" as const } } },
        { code: { codePreview: { contains: q, mode: "insensitive" as const } } },
      ] }] : []),
    ],
  };
  const redemptionWhere: Prisma.PaymentCodeRedemptionEventWhereInput = {
    AND: [
      ...(hasPath ? [{ subject: subjectPath }] : []),
      ...(q ? [{ OR: [
        { user: { email: { contains: q, mode: "insensitive" as const } } },
        { code: { supportReference: { contains: q, mode: "insensitive" as const } } },
        { code: { codePreview: { contains: q, mode: "insensitive" as const } } },
        { plan: { title: { contains: q, mode: "insensitive" as const } } },
        { subject: { name: { contains: q, mode: "insensitive" as const } } },
      ] }] : []),
    ],
  };

  const rows = kind === "admin"
    ? await prisma.paymentAdminEvent.findMany({
        where: adminWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE + 1,
        include: {
          actor: { select: { name: true, email: true } },
          entitlement: { select: { orderItem: { select: { order: { select: { id: true, reference: true } } } } } },
        },
      })
    : [];
  const redemptions = kind === "redemptions"
    ? await prisma.paymentCodeRedemptionEvent.findMany({
        where: redemptionWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE + 1,
        include: {
          user: { select: { email: true } },
          code: { select: { codePreview: true, supportReference: true } },
          plan: { select: { title: true } },
          subject: { select: { name: true } },
        },
      })
    : [];

  const query = new URLSearchParams({ kind });
  if (q) query.set("q", q);
  if (kind === "admin" && action) query.set("action", action);
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  const activeRows = kind === "admin" ? rows : redemptions;
  const hasNext = activeRows.length > PAGE_SIZE;
  const tabHref = (nextKind: AuditKind) => {
    const next = new URLSearchParams(query);
    next.set("kind", nextKind);
    next.delete("page");
    if (nextKind === "redemptions") next.delete("action");
    return "?" + next.toString();
  };

  return <div className="space-y-5" dir="rtl">
    <Button asChild variant="ghost"><Link href="/admin/subscriptions"><ArrowRight className="ml-2 h-4 w-4" />الاشتراكات</Link></Button>
    <div><h1 className="text-2xl font-bold">سجل تدقيق الاشتراكات</h1><p className="mt-1 text-sm text-muted-foreground">بحث مدقق في إجراءات الإدارة وعمليات تفعيل الأكواد الناجحة.</p></div>

    <nav className="flex flex-wrap gap-2" aria-label="أنواع سجل التدقيق">
      <Button asChild variant={kind === "admin" ? "default" : "outline"}><Link href={tabHref("admin")}>إجراءات الإدارة</Link></Button>
      <Button asChild variant={kind === "redemptions" ? "default" : "outline"}><Link href={tabHref("redemptions")}>تفعيلات الأكواد</Link></Button>
    </nav>

    <AdminContentPathFilters through="subject" universityType="university" countryCode="SA" />
    <form method="get" className="flex flex-wrap items-end gap-3 border-y py-4">
      <input type="hidden" name="kind" value={kind} />
      {Object.entries(filters).map(([key, value]) => value ? <input key={key} type="hidden" name={key} value={value} /> : null)}
      <div className="min-w-0 flex-1 basis-64"><label htmlFor="audit-search" className="mb-1 block text-sm">بحث</label><Input id="audit-search" name="q" defaultValue={q} maxLength={160} placeholder="البريد، المرجع، الخطة أو السبب" /></div>
      {kind === "admin" ? <div><label htmlFor="audit-action" className="mb-1 block text-sm">العملية</label><select id="audit-action" name="action" defaultValue={action} className="h-10 max-w-full rounded-md border bg-background px-3 text-sm"><option value="">كل العمليات</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div> : null}
      <Button type="submit" className="gap-2"><Search className="h-4 w-4" />تطبيق</Button>
    </form>

    {kind === "admin" ? <AdminTableShell minWidth="min-w-[900px]">
      <Table><TableHeader><TableRow><TableHead>الوقت</TableHead><TableHead>العملية</TableHead><TableHead>الأدمن</TableHead><TableHead>السجل</TableHead><TableHead>السبب الداخلي</TableHead><TableHead>التغيير</TableHead></TableRow></TableHeader>
        <TableBody>{rows.slice(0, PAGE_SIZE).map((row) => <TableRow key={row.id}>
          <TableCell className="whitespace-nowrap">{row.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</TableCell>
          <TableCell>{labels[row.action]}</TableCell>
          <TableCell className="max-w-48 break-words">{row.actor.name || row.actor.email}</TableCell>
          <TableCell><span dir="ltr" className="block font-mono text-xs">{row.planId ?? row.codeId ?? row.entitlementId}</span>{row.entitlement?.orderItem ? <Link className="text-primary underline" href={"/admin/payment-orders/" + row.entitlement.orderItem.order.id}>{row.entitlement.orderItem.order.reference}</Link> : null}</TableCell>
          <TableCell className="min-w-48 max-w-80 whitespace-pre-wrap break-words">{row.reason}</TableCell>
          <TableCell><details><summary className="cursor-pointer whitespace-nowrap">قبل / بعد</summary><pre dir="ltr" className="max-h-64 max-w-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ before: row.before, after: row.after }, null, 2)}</pre></details></TableCell>
        </TableRow>)}{rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد عمليات مطابقة</TableCell></TableRow> : null}</TableBody>
      </Table>
    </AdminTableShell> : <AdminTableShell minWidth="min-w-[900px]">
      <Table><TableHeader><TableRow><TableHead>الوقت</TableHead><TableHead>الطالب</TableHead><TableHead>الكود</TableHead><TableHead>الخطة</TableHead><TableHead>المادة</TableHead><TableHead>الاستحقاق</TableHead><TableHead>الاستخدام</TableHead></TableRow></TableHeader>
        <TableBody>{redemptions.slice(0, PAGE_SIZE).map((row) => <TableRow key={row.id}>
          <TableCell className="whitespace-nowrap">{row.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</TableCell>
          <TableCell dir="ltr" className="text-xs">{row.user.email}</TableCell><TableCell dir="ltr" className="font-mono text-xs">{row.code.supportReference ?? row.code.codePreview ?? row.codeId}</TableCell>
          <TableCell>{row.plan.title}</TableCell><TableCell>{row.subject.name}</TableCell>
          <TableCell dir="ltr" className="font-mono text-xs">{row.entitlementId}</TableCell><TableCell>{row.usageNumber}</TableCell>
        </TableRow>)}{redemptions.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">لا توجد تفعيلات مطابقة</TableCell></TableRow> : null}</TableBody>
      </Table>
    </AdminTableShell>}

    <nav className="flex items-center justify-between gap-3" aria-label="صفحات سجل التدقيق">
      <span className="text-sm text-muted-foreground">الصفحة {page}</span><div className="flex gap-2">
        {page > 1 ? <Button asChild variant="outline" size="icon"><Link href={paginationHref(query, page - 1)} aria-label="السابق" title="السابق"><ChevronRight className="h-4 w-4" /></Link></Button> : null}
        {hasNext && page < 10000 ? <Button asChild variant="outline" size="icon"><Link href={paginationHref(query, page + 1)} aria-label="التالي" title="التالي"><ChevronLeft className="h-4 w-4" /></Link></Button> : null}
      </div>
    </nav>
  </div>;
}

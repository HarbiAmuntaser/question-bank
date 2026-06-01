"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Edit, Plus, Power, Ticket } from "lucide-react";

import {
  disableAccessEntitlementAction,
  disableSubscriptionCodeAction,
} from "@/app/admin/subscriptions/actions";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { CodeDialog } from "@/components/admin/subscriptions/code-dialog";
import { PlanDialog } from "@/components/admin/subscriptions/plan-dialog";
import type {
  CodeRow,
  EntitlementRow,
  PaginationMeta,
  PlanRow,
  StatusFilter,
  SubscriptionFilters,
} from "@/components/admin/subscriptions/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-SA");
}

function scopeLabel(value: "major" | "subject") {
  return value === "major" ? "تخصص" : "مقرر";
}

function statusBadge(active: boolean) {
  return <Badge variant={active ? "default" : "secondary"}>{active ? "نشط" : "معطل"}</Badge>;
}

function useAdminTableParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return {
    tab: ["plans", "codes", "entitlements"].includes(searchParams.get("tab") ?? "")
      ? searchParams.get("tab") ?? "plans"
      : "plans",
    setParams(changes: Record<string, string | number | null>) {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
  };
}

function StatusSelect({
  label,
  value,
  param,
  pageParam,
  tab,
  options,
}: {
  label: string;
  value: StatusFilter;
  param: string;
  pageParam: string;
  tab: string;
  options: Array<{ value: StatusFilter; label: string }>;
}) {
  const { setParams } = useAdminTableParams();

  return (
    <div className="flex w-full flex-col gap-1 sm:w-56">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select
        value={value}
        onValueChange={(next) => setParams({ [param]: next, [pageParam]: 1, tab })}
      >
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TablePager({
  pagination,
  pageParam,
  tab,
}: {
  pagination: PaginationMeta;
  pageParam: string;
  tab: string;
}) {
  const { setParams } = useAdminTableParams();
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  return (
    <div className="flex flex-col gap-3 border-t px-2 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        صفحة {pagination.page} من {pagination.totalPages}
        <span className="mx-2">•</span>
        {pagination.total} عنصر
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => setParams({ [pageParam]: Math.max(1, pagination.page - 1), tab })}
        >
          السابق
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => setParams({ [pageParam]: pagination.page + 1, tab })}
        >
          التالي
        </Button>
      </div>
    </div>
  );
}

export function SubscriptionsAdmin({
  plans,
  codePlanOptions,
  codes,
  entitlements,
  filters,
  plansPagination,
  codesPagination,
  entitlementsPagination,
}: {
  plans: PlanRow[];
  codePlanOptions: PlanRow[];
  codes: CodeRow[];
  entitlements: EntitlementRow[];
  filters: SubscriptionFilters;
  plansPagination: PaginationMeta;
  codesPagination: PaginationMeta;
  entitlementsPagination: PaginationMeta;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const { tab, setParams } = useAdminTableParams();

  const disableCode = (id: string) => {
    startTransition(async () => {
      const result = await disableSubscriptionCodeAction(id);
      toast({ title: result.success ? "تم" : "خطأ", description: result.message, variant: result.success ? "default" : "destructive" });
    });
  };

  const disableEntitlement = (id: string) => {
    startTransition(async () => {
      const result = await disableAccessEntitlementAction(id);
      toast({ title: result.success ? "تم" : "خطأ", description: result.message, variant: result.success ? "default" : "destructive" });
    });
  };

  return (
    <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })} className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="plans">الخطط</TabsTrigger>
          <TabsTrigger value="codes">الأكواد</TabsTrigger>
          <TabsTrigger value="entitlements">التفعيلات</TabsTrigger>
        </TabsList>
        <div className="flex flex-col gap-2 sm:flex-row">
          <PlanDialog>
            <Button className="h-10">
              <Plus className="ml-2 h-4 w-4" aria-hidden />
              خطة جديدة
            </Button>
          </PlanDialog>
          <CodeDialog plans={codePlanOptions}>
            <Button variant="outline" className="h-10">
              <Ticket className="ml-2 h-4 w-4" aria-hidden />
              كود جديد
            </Button>
          </CodeDialog>
        </div>
      </div>

      <TabsContent value="plans" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <StatusSelect
            label="حالة الخطط"
            value={filters.plansStatus}
            param="plansStatus"
            pageParam="plansPage"
            tab="plans"
            options={[
              { value: "all", label: "كل الخطط" },
              { value: "active", label: "الخطط النشطة" },
              { value: "disabled", label: "الخطط المعطلة" },
            ]}
          />
        </div>
        <AdminTableShell minWidth="min-w-[1100px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الخطة</TableHead>
                <TableHead>النطاق</TableHead>
                <TableHead>الهدف</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>التواصل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد خطط مطابقة</TableCell></TableRow>
              ) : plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="font-medium">{plan.title}</div>
                    {plan.description ? <div className="line-clamp-1 text-xs text-muted-foreground">{plan.description}</div> : null}
                  </TableCell>
                  <TableCell>{scopeLabel(plan.scopeType)}</TableCell>
                  <TableCell>
                    <div>{plan.scopeType === "major" ? plan.major?.name : plan.subject?.name}</div>
                    <div className="text-xs text-muted-foreground">{plan.major?.universityName ?? plan.subject?.universityName ?? ""}</div>
                  </TableCell>
                  <TableCell>{plan.price ? `${plan.price} ${plan.currency ?? ""}` : "-"}</TableCell>
                  <TableCell>{plan.defaultDurationDays ? `${plan.defaultDurationDays} يوم` : "مفتوحة"}</TableCell>
                  <TableCell>
                    <div dir="ltr" className="text-xs">{plan.whatsappNumber ?? "-"}</div>
                    <div dir="ltr" className="text-xs text-muted-foreground">{plan.telegramUsername ?? ""}</div>
                  </TableCell>
                  <TableCell>{statusBadge(plan.isActive)}</TableCell>
                  <TableCell className="text-left">
                    <PlanDialog plan={plan}>
                      <Button variant="ghost" size="sm" aria-label="تعديل الخطة">
                        <Edit className="h-4 w-4" aria-hidden />
                      </Button>
                    </PlanDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager pagination={plansPagination} pageParam="plansPage" tab="plans" />
        </AdminTableShell>
      </TabsContent>

      <TabsContent value="codes" className="space-y-3">
        <StatusSelect
          label="حالة الأكواد"
          value={filters.codesStatus}
          param="codesStatus"
          pageParam="codesPage"
          tab="codes"
          options={[
            { value: "all", label: "كل الأكواد" },
            { value: "active", label: "الأكواد النشطة" },
            { value: "disabled", label: "الأكواد المعطلة" },
          ]}
        />
        <AdminTableShell minWidth="min-w-[1050px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الخطة</TableHead>
                <TableHead>الاستخدام</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>الصلاحية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>ملاحظة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد أكواد مطابقة</TableCell></TableRow>
              ) : codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell dir="ltr" className="font-mono">{code.codePreview ?? "-"}</TableCell>
                  <TableCell>
                    <div>{code.planTitle}</div>
                    <div className="text-xs text-muted-foreground">{scopeLabel(code.planScopeType)}</div>
                  </TableCell>
                  <TableCell>{code.usedCount} / {code.maxUses}</TableCell>
                  <TableCell>{code.durationDays ? `${code.durationDays} يوم` : "افتراضي"}</TableCell>
                  <TableCell>
                    <div className="text-xs">من: {formatDate(code.startsAt)}</div>
                    <div className="text-xs text-muted-foreground">إلى: {formatDate(code.expiresAt)}</div>
                  </TableCell>
                  <TableCell>{statusBadge(code.isActive)}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{code.note ?? "-"}</TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || !code.isActive}
                      onClick={() => disableCode(code.id)}
                      aria-label="تعطيل الكود"
                    >
                      <Power className="h-4 w-4" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager pagination={codesPagination} pageParam="codesPage" tab="codes" />
        </AdminTableShell>
      </TabsContent>

      <TabsContent value="entitlements" className="space-y-3">
        <StatusSelect
          label="حالة التفعيلات"
          value={filters.entitlementsStatus}
          param="entitlementsStatus"
          pageParam="entitlementsPage"
          tab="entitlements"
          options={[
            { value: "all", label: "كل التفعيلات" },
            { value: "active", label: "التفعيلات النشطة" },
            { value: "disabled", label: "التفعيلات المعطلة" },
            { value: "expired", label: "التفعيلات المنتهية" },
          ]}
        />
        <AdminTableShell minWidth="min-w-[1050px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النطاق</TableHead>
                <TableHead>الهدف</TableHead>
                <TableHead>الجلسة</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>البداية</TableHead>
                <TableHead>النهاية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entitlements.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد تفعيلات مطابقة</TableCell></TableRow>
              ) : entitlements.map((entitlement) => (
                <TableRow key={entitlement.id}>
                  <TableCell>{scopeLabel(entitlement.scopeType)}</TableCell>
                  <TableCell>{entitlement.scopeType === "major" ? entitlement.majorName : entitlement.subjectName}</TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs">{entitlement.sessionPreview}</TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs">{entitlement.codePreview ?? "-"}</TableCell>
                  <TableCell>{formatDate(entitlement.startsAt)}</TableCell>
                  <TableCell>{formatDate(entitlement.expiresAt)}</TableCell>
                  <TableCell>{statusBadge(entitlement.isActive)}</TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || !entitlement.isActive}
                      onClick={() => disableEntitlement(entitlement.id)}
                      aria-label="تعطيل الاشتراك"
                    >
                      <Power className="h-4 w-4" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager pagination={entitlementsPagination} pageParam="entitlementsPage" tab="entitlements" />
        </AdminTableShell>
      </TabsContent>
    </Tabs>
  );
}

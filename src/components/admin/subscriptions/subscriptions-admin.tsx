"use client";

import { useTransition } from "react";
import { Edit, Plus, Power, Ticket } from "lucide-react";

import {
  disableAccessEntitlementAction,
  disableSubscriptionCodeAction,
} from "@/app/admin/subscriptions/actions";
import { AdminTableShell } from "@/components/admin/admin-table-shell";
import { CodeDialog } from "@/components/admin/subscriptions/code-dialog";
import { PlanDialog } from "@/components/admin/subscriptions/plan-dialog";
import type { CodeRow, EntitlementRow, PlanRow } from "@/components/admin/subscriptions/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function SubscriptionsAdmin({
  plans,
  codes,
  entitlements,
}: {
  plans: PlanRow[];
  codes: CodeRow[];
  entitlements: EntitlementRow[];
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

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
    <Tabs defaultValue="plans" className="space-y-4" dir="rtl">
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
          <CodeDialog plans={plans.filter((plan) => plan.isActive)}>
            <Button variant="outline" className="h-10">
              <Ticket className="ml-2 h-4 w-4" aria-hidden />
              كود جديد
            </Button>
          </CodeDialog>
        </div>
      </div>

      <TabsContent value="plans">
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
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد خطط اشتراك</TableCell></TableRow>
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
                  <TableCell><Badge variant={plan.isActive ? "default" : "secondary"}>{plan.isActive ? "نشطة" : "معطلة"}</Badge></TableCell>
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
        </AdminTableShell>
      </TabsContent>

      <TabsContent value="codes">
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
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد أكواد اشتراك</TableCell></TableRow>
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
                  <TableCell><Badge variant={code.isActive ? "default" : "secondary"}>{code.isActive ? "نشط" : "معطل"}</Badge></TableCell>
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
        </AdminTableShell>
      </TabsContent>

      <TabsContent value="entitlements">
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
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">لا توجد اشتراكات مفعلة</TableCell></TableRow>
              ) : entitlements.map((entitlement) => (
                <TableRow key={entitlement.id}>
                  <TableCell>{scopeLabel(entitlement.scopeType)}</TableCell>
                  <TableCell>{entitlement.scopeType === "major" ? entitlement.majorName : entitlement.subjectName}</TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs">{entitlement.sessionPreview}</TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs">{entitlement.codePreview ?? "-"}</TableCell>
                  <TableCell>{formatDate(entitlement.startsAt)}</TableCell>
                  <TableCell>{formatDate(entitlement.expiresAt)}</TableCell>
                  <TableCell><Badge variant={entitlement.isActive ? "default" : "secondary"}>{entitlement.isActive ? "نشط" : "معطل"}</Badge></TableCell>
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
        </AdminTableShell>
      </TabsContent>
    </Tabs>
  );
}

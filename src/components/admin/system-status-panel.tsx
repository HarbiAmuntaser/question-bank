"use client"

import { useState, useTransition } from "react"
import { Activity, Database, HardDrive, Mail, RefreshCw, Server, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardExternalCheck, DashboardSystemOverview, RuntimeState } from "@/types/dashboard"

type HealthPayload = {
  data: {
    checks: DashboardExternalCheck[]
    checkedAt: string
  }
}

const releaseLabels: Record<keyof DashboardSystemOverview["releaseControls"], string> = {
  payment: "البيع اليدوي",
  paymentReview: "مراجعة الدفع",
  activationCodes: "أكواد التفعيل",
  studentRegistration: "تسجيل الطلاب",
  googleAuth: "دخول Google",
  telegram: "Telegram",
  adsense: "AdSense",
}

function stateLabel(value: RuntimeState) {
  if (value === "enabled") return "مفعّل"
  if (value === "misconfigured") return "إعداد غير مكتمل"
  return "مغلق"
}

function stateVariant(value: RuntimeState): "default" | "secondary" | "destructive" {
  if (value === "enabled") return "default"
  if (value === "misconfigured") return "destructive"
  return "secondary"
}

function formatDate(value: string | null) {
  if (!value) return "لا توجد معالجة مسجلة"
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function SystemStatusPanel({ system }: { system: DashboardSystemOverview }) {
  const [checks, setChecks] = useState<DashboardExternalCheck[] | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  const runChecks = () => {
    startTransition(async () => {
      setError(false)
      try {
        const response = await fetch("/api/v1/admin/dashboard/health", { method: "POST" })
        if (!response.ok) throw new Error("health_check_failed")
        const payload = (await response.json()) as HealthPayload
        setChecks(payload.data.checks)
        setCheckedAt(payload.data.checkedAt)
      } catch {
        setError(true)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            مؤشرات النظام
          </CardTitle>
          <CardDescription className="mt-1">حالة آمنة من Runtime وقاعدة البيانات دون عرض أسرار.</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={runChecks} disabled={isPending}>
          <RefreshCw className={isPending ? "animate-spin" : undefined} />
          فحص الاتصالات
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusRow
            icon={Database}
            label="قاعدة البيانات"
            value={system.database.status === "healthy" ? `سليمة · ${system.database.latencyMs ?? 0}ms` : "غير متاحة"}
            healthy={system.database.status === "healthy"}
          />
          <StatusRow
            icon={Server}
            label="بيئة التشغيل"
            value={system.runtime.commitSha ? `${system.runtime.environment} · ${system.runtime.commitSha.slice(0, 7)}` : system.runtime.environment}
            healthy
          />
          <StatusRow
            icon={Mail}
            label="SMTP"
            value={system.configuration.smtp === "configured" ? "مهيأ" : "إعداد غير مكتمل"}
            healthy={system.configuration.smtp === "configured"}
          />
          <StatusRow
            icon={HardDrive}
            label="R2"
            value={system.configuration.r2 === "configured" ? "مهيأ" : "إعداد غير مكتمل"}
            healthy={system.configuration.r2 === "configured"}
          />
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            مفاتيح الإطلاق
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(system.releaseControls).map(([key, value]) => (
              <Badge key={key} variant={stateVariant(value)} className="gap-1.5 px-2.5 py-1">
                {releaseLabels[key as keyof typeof releaseLabels]}: {stateLabel(value)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-semibold">تشغيل Telegram</div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <span>القنوات المفعلة: {system.telegramOperations.connectedChannels.toLocaleString("ar-SA")}</span>
            <span>المهام المعلقة: {system.telegramOperations.pendingJobs.toLocaleString("ar-SA")}</span>
            <span className={system.telegramOperations.failedJobs > 0 ? "text-destructive" : undefined}>
              المهام الفاشلة: {system.telegramOperations.failedJobs.toLocaleString("ar-SA")}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            آخر معالجة ناجحة: {formatDate(system.telegramOperations.lastCompletedAt)}
          </div>
        </div>

        {checks && (
          <div className="rounded-md border p-3" aria-live="polite">
            <div className="mb-2 text-sm font-semibold">نتيجة الفحص عند الطلب</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {checks.map((check) => (
                <div key={check.service} className="flex items-center justify-between gap-2 text-sm">
                  <span>{check.service.toUpperCase()}</span>
                  <span className={check.status === "healthy" ? "text-emerald-700" : "text-destructive"}>
                    {check.status === "healthy" ? `سليم · ${check.latencyMs ?? 0}ms` : "غير متاح"}
                  </span>
                </div>
              ))}
            </div>
            {checkedAt && <div className="mt-2 text-xs text-muted-foreground">تم الفحص: {formatDate(checkedAt)}</div>}
          </div>
        )}

        {error && <p className="text-sm text-destructive" role="alert">تعذر إكمال فحص الاتصالات.</p>}
      </CardContent>
    </Card>
  )
}

function StatusRow({
  icon: Icon,
  label,
  value,
  healthy,
}: {
  icon: typeof Database
  label: string
  value: string
  healthy: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span className={healthy ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{value}</span>
    </div>
  )
}

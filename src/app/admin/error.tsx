"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("admin_route_render_failed", { digest: error.digest ?? null })
  }, [error.digest])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center p-6" dir="rtl">
      <div className="w-full space-y-4 rounded-md border border-destructive/30 bg-card p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">تعذر تحميل صفحة الإدارة</h1>
          <p className="text-sm text-muted-foreground">
            لم يتم تطبيق أي تغيير جزئي. أعد المحاولة، وإن استمرت المشكلة راجع سجل التشغيل باستخدام معرف الخطأ.
          </p>
        </div>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground" dir="ltr">
            {error.digest}
          </p>
        ) : null}
        <Button type="button" onClick={reset}>
          <RotateCcw className="ml-2 h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    </div>
  )
}

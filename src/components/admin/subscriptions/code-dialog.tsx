"use client"

import type React from "react"
import { useCallback, useRef, useState, useTransition } from "react"

import { createSubscriptionCodeAction, searchCodePlansAction } from "@/app/admin/subscriptions/actions"
import {
  AdminContentPathPicker,
  emptyAdminContentPath,
  type AdminContentPathValue,
} from "@/components/admin/admin-content-path-picker"
import { AsyncCombobox, type ComboOption } from "@/components/admin/seo/AsyncCombobox"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export function CodeDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState<AdminContentPathValue>({ ...emptyAdminContentPath })
  const [plan, setPlan] = useState<ComboOption | null>(null)
  const [generatedCode, setGeneratedCode] = useState("")
  const issuanceKey = useRef("")
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  const fetchPlans = useCallback(
    (query: string) => path.subjectId ? searchCodePlansAction({ subjectId: path.subjectId, query }) : Promise.resolve([]),
    [path.subjectId],
  )

  function resetSelection(nextPath: AdminContentPathValue) {
    if (nextPath.subjectId !== path.subjectId) setPlan(null)
    issuanceKey.current = ""
    setPath(nextPath)
  }

  function handleSubmit(formData: FormData) {
    formData.set("planId", plan?.id ?? "")
    issuanceKey.current ||= crypto.randomUUID()
    formData.set("idempotencyKey", issuanceKey.current)
    if (!path.subjectId || !plan) {
      toast({ title: "تحقق من البيانات", description: "اختيار المادة والخطة مطلوب.", variant: "destructive" })
      return
    }

    startTransition(async () => {
      const result = await createSubscriptionCodeAction(formData)
      if (result.success) {
        if (result.alreadyIssued) {
          toast({ title: "تمت المعالجة", description: result.message })
          issuanceKey.current = ""
          setOpen(false)
          return
        }
        setGeneratedCode(result.plainCode ?? "")
        toast({ title: "تم", description: result.message })
      } else {
        toast({ title: "تعذر الإصدار", description: result.message, variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (pending) return
      setOpen(next)
      if (!next) {
        setGeneratedCode("")
        setPath({ ...emptyAdminContentPath })
        setPlan(null)
        issuanceKey.current = ""
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء كود اشتراك</DialogTitle>
          <DialogDescription>اختر المادة ثم خطة مفعلة للأكواد. سيظهر الكود الصريح مرة واحدة فقط.</DialogDescription>
        </DialogHeader>

        {generatedCode ? (
          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <Label>الكود الصريح</Label>
            <Input value={generatedCode} readOnly dir="ltr" className="font-mono text-base" onFocus={(event) => event.currentTarget.select()} />
            <p className="text-sm text-muted-foreground">انسخ الكود الآن. بعد إغلاق النافذة سيظهر جزء آمن منه فقط.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setGeneratedCode(""); setPlan(null); issuanceKey.current = "" }}>إنشاء كود آخر</Button>
              <Button type="button" onClick={() => { setGeneratedCode(""); setOpen(false) }}>تم</Button>
            </div>
          </div>
        ) : (
          <form action={handleSubmit} onChangeCapture={() => { if (!pending) issuanceKey.current = "" }} className="space-y-5">
            <AdminContentPathPicker value={path} onChange={resetSelection} paymentScope disabled={pending} />
            <div className="space-y-2">
              <Label>الخطة</Label>
              <AsyncCombobox
                value={plan}
                onChange={(value) => { setPlan(value); issuanceKey.current = "" }}
                fetcher={fetchPlans}
                depsKey={path.subjectId}
                placeholder={path.subjectId ? "اختر خطة مفعلة للأكواد" : "اختر المادة أولًا"}
                disabled={!path.subjectId || pending}
                disablePortal
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationDays">مدة الكود بالأيام</Label>
                <Input id="durationDays" name="durationDays" type="number" min="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startsAt">يبدأ في (توقيت الرياض)</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">ينتهي في (توقيت الرياض)</Label>
                <Input id="expiresAt" name="expiresAt" type="datetime-local" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">ملاحظة داخلية</Label>
                <Textarea id="note" name="note" rows={3} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code-reason">سبب إصدار الكود (داخلي)</Label>
              <Textarea id="code-reason" name="reason" required minLength={5} maxLength={1000} rows={2} />
            </div>
            <DialogFooter><Button type="submit" disabled={pending || !plan}>{pending ? "جارٍ الإنشاء..." : "إنشاء الكود"}</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

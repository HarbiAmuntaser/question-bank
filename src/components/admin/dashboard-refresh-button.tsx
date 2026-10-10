"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { RefreshCw } from "lucide-react"

import { refreshDashboardStatsAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

export function DashboardRefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await refreshDashboardStatsAction()
          router.refresh()
        })
      }}
    >
      <RefreshCw className={isPending ? "animate-spin" : undefined} />
      {isPending ? "جارٍ التحديث" : "تحديث الإحصاءات"}
    </Button>
  )
}

"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { requireAdminPermission } from "@/lib/admin-auth"
import { CACHE_TAGS } from "@/lib/cache-tags"

export async function refreshDashboardStatsAction() {
  await requireAdminPermission("dashboard:refresh")
  revalidateTag(CACHE_TAGS.admin.dashboardStats)
  revalidatePath("/admin")
  return { success: true }
}

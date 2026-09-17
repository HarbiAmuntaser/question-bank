import "server-only";

import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import type { AdminPermission } from "@/lib/admin-permissions";

export async function requireAdminPage(permission: AdminPermission) {
  const access = await getAdminAccess(permission);
  if (!access.ok) {
    redirect(access.status === 401 ? "/auth/admin/signin" : "/auth/forbidden");
  }
  return access;
}

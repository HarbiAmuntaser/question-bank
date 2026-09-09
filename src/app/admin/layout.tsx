import type React from "react"
import { requireAdminPage } from "@/lib/server/admin-page-auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "@/providers/session-provider"
import { AdminDirectionProvider } from "@/components/admin/admin-direction-provider"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdminPage("dashboard:read")
  const session = await getServerSession(authOptions)
  if (session?.user) session.user.role = admin.role

  return (
    <SessionProvider session={session}>
      <AdminDirectionProvider>
        <div className="min-h-screen bg-gray-50 text-right dark:bg-gray-900" dir="rtl">
          <AdminSidebar role={admin.role} />
          <div className="lg:pr-64">
            <AdminHeader role={admin.role} />
            <main className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
                <Toaster />
              </div>
            </main>
          </div>
        </div>
      </AdminDirectionProvider>
    </SessionProvider>
  )
}

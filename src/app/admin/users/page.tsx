import { requireAdminPage } from "@/lib/server/admin-page-auth";
import UsersTable from "@/components/admin/users/UsersTable";
import { prisma } from "@/lib/prisma";

async function getInitialUsers() {
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 26,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Server Components pass plain serializable data to the hydrated table.
  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));
}

export default async function UsersPage() {
  const admin = await requireAdminPage("users:manage");

  const users = await getInitialUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">إنشاء وتعديل وحذف المستخدمين ذوي الصلاحيات</p>
      </div>
      <UsersTable initialRows={users.slice(0, 25)} initialHasMore={users.length > 25} currentUserId={admin.userId} />
    </div>
  );
}

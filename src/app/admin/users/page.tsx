import UsersTable from "@/components/admin/users/UsersTable";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">إنشاء وتعديل وحذف المستخدمين ذوي الصلاحيات</p>
      </div>
      <UsersTable />
    </div>
  );
}

"use client";

import { AdminNavList } from "./admin-nav";

export function AdminSidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col" dir="rtl">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm border-l dark:bg-gray-900">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-primary">بنك الأسئلة السعودي</h1>
        </div>

        <nav className="flex flex-1 flex-col" aria-label="تنقل الإدارة">
          <AdminNavList />
        </nav>
      </div>
    </div>
  );
}

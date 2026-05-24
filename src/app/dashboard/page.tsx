// src/app/dashboard/page.tsx
import { StudentDashboard } from "@/components/public/dashboard/student-dashboard";
import { PublicHeader } from "@/components/public/public-header/public-header";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader />
      <main className="container mx-auto px-4 py-8">
        <StudentDashboard />
      </main>
    </div>
  );
}

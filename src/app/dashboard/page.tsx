// src/app/dashboard/page.tsx
import { StudentDashboard } from "@/components/public/dashboard/student-dashboard";
import { PublicHeader } from "@/components/public/public-header/public-header";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <StudentDashboard />
      </main>
    </div>
  );
}

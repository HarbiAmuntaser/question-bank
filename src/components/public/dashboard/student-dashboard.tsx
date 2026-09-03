// src/components/public/dashboard/student-dashboard.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useDashboardResults } from "./use-dashboard-results";
import { DashboardHeader } from "./dashboard-header";
import { StatsGrid } from "./stats-grid";
import { RecentActivityCard } from "./recent-activity-card";
import { PerformanceOverviewCard } from "./performance-overview-card";
import { AnalyticsCards } from "./analytics-cards";
import { QuickActions } from "./quick-actions";

export function StudentDashboard() {
  const { loaded, stats, recentResults, results, clearAll, exportAll } = useDashboardResults();

  // ✅ فقط تبويبين
  const [tab, setTab] = useState<"overview" | "analytics">("overview");

  if (!loaded) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" role="status" aria-label="جاري تحميل لوحة التحكم" />
          <p className="text-sm font-medium text-foreground/75">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    // ✅ RTL على مستوى الصفحة كلها
    <div dir="rtl" className="space-y-5 text-right sm:space-y-6">
      <DashboardHeader />

      <StatsGrid stats={stats} />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "overview" || value === "analytics") setTab(value);
        }}
        className="space-y-5 sm:space-y-6"
      >
        {/* ✅ grid-cols-2 بدل 3 */}
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {tab === "overview" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              <RecentActivityCard recentResults={recentResults} />
              <PerformanceOverviewCard stats={stats} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {tab === "analytics" ? <AnalyticsCards results={results} stats={stats} /> : null}
        </TabsContent>
      </Tabs>

      <QuickActions onExport={exportAll} onClear={clearAll} />
    </div>
  );
}

import { UniversityGrid } from "@/components/public/university-grid";
import { StatsSection } from "@/components/public/stats-section";
import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer";

// ISR للصفحة الرئيسية (تحمّل عالي)
export const revalidate = 300; // 5 دقائق

export default function HomePage() {
  // مكوناتك الحالية تتولى العرض؛ الربط عبر /api/v1/student/* سنضيفه داخلها لاحقًا.
  // هذا يبقي التصميم دون تغيير ويمنحنا ISR على مستوى الصفحة.
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <PublicHeader />
      <main>
        
        {/* <FeaturedQuizzes /> */}
        <StatsSection />
      </main>
    </div>
  );
}
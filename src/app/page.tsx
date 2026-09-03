import { StatsSection } from "@/components/public/stats-section";
import { PublicHeader } from "@/components/public/public-header/public-header";

// ISR للصفحة الرئيسية (تحمّل عالي)
export const revalidate = 3600; // ساعة واحدة كبداية قبل رفع TTL أكثر.

export default function HomePage() {
  // مكوناتك الحالية تتولى العرض؛ الربط عبر /api/v1/student/* سنضيفه داخلها لاحقًا.
  // هذا يبقي التصميم دون تغيير ويمنحنا ISR على مستوى الصفحة.
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        
        {/* <FeaturedQuizzes /> */}
        <StatsSection />
      </main>
    </div>
  );
}

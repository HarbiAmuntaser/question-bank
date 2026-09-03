import { PublicLoadingState } from "@/components/public/public-loading-state";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PublicLoadingState title="جاري تجهيز الاختبار..." description="نحمّل الأسئلة ونجهز جلسة الاختبار." />
    </div>
  );
}

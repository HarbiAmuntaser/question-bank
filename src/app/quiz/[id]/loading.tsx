import { PublicLoadingState } from "@/components/public/public-loading-state";

export default function Loading() {
  return (
    <div className="container py-10">
      <PublicLoadingState
        title="جاري تحضير الاختبار..."
        description="نحمّل الأسئلة ونجهز واجهة الحل قبل البدء."
        variant="quiz"
      />
    </div>
  );
}

import { PublicLoadingState } from "@/components/public/public-loading-state";

export default function Loading() {
  return (
    <div className="container py-10">
      <PublicLoadingState
        title="جاري فتح صفحة المؤسسة..."
        description="نجهز تفاصيل المؤسسة والتخصصات المرتبطة بها."
        cards={3}
      />
    </div>
  );
}

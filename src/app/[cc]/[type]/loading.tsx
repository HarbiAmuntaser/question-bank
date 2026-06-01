import { PublicLoadingState } from "@/components/public/public-loading-state";

export default function Loading() {
  return (
    <div className="container py-10">
      <PublicLoadingState
        title="جاري تجهيز قائمة المؤسسات..."
        description="نحضّر الجامعات والمدارس والأكاديميات لتظهر لك بترتيب واضح."
        cards={6}
      />
    </div>
  );
}

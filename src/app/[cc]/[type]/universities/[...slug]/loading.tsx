import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="container py-20 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

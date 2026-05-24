// file: src/app/[cc]/[type]/loading.tsx

import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div
      className="container py-20 flex items-center justify-center"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <LoadingSpinner />
    </div>
  );
}

"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function OrdersError({ reset }: { reset: () => void }) {
  return <div role="alert" className="space-y-4 py-8"><h1 className="text-xl font-semibold">تعذر تحميل الطلبات</h1>
    <Button onClick={reset} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" />إعادة المحاولة</Button></div>;
}

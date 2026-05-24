// src/components/public/dashboard/quick-actions.tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Trash2, Download } from "lucide-react";
import { downloadJson } from "./dashboard-utils";

export function QuickActions({
  onExport,
  onClear,
}: {
  onExport: () => any;
  onClear: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="flex items-center gap-2">
            <Link href="/">
              <BookOpen className="h-4 w-4" aria-hidden />
              العودة للصفحة الرئيسية
            </Link>
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => {
              const payload = onExport();
              downloadJson(`quiz-results-${Date.now()}.json`, payload);
            }}
          >
            <Download className="h-4 w-4" aria-hidden />
            تصدير النتائج
          </Button>

          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={() => {
              const ok = confirm("هل أنت متأكد؟ سيتم حذف جميع نتائجك المخزّنة على هذا الجهاز.");
              if (ok) onClear();
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            مسح البيانات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

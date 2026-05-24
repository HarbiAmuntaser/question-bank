"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// تطابق هيكل استجابة GET /api/v1/admin/universities/[id]
interface MajorLite {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  _count?: { subjects: number };
}

interface UniversityDetailsDTO {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string | null;
  majors: MajorLite[];
  _count?: { majors: number };

  // 👇 جديد
  countryCode: string;
  institutionType: "university" | "school" | "academy";
}

export function UniversityDetailsDialog({
  universityId,
  open,
  onOpenChange,
}: {
  universityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [university, setUniversity] = useState<UniversityDetailsDTO | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void fetchUniversityDetails();
    }
    // أعد ضبط الحالة عند الإغلاق حتى لا تعرض بيانات قديمة لمعرف آخر
    if (!open) {
      setUniversity(null);
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, universityId]);

  const fetchUniversityDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/universities/${universityId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errJson?.error ?? "فشل تحميل التفاصيل");
      }
      const json = (await res.json()) as { data: UniversityDetailsDTO };
      setUniversity(json.data);
    } catch (err) {
      setError((err as Error).message || "حدث خطأ أثناء تحميل البيانات");
      // eslint-disable-next-line no-console
      console.error("Error fetching university details:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            تفاصيل الجامعة
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 font-medium">{error}</div>
            <button
              onClick={fetchUniversityDetails}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : university ? (
          <div className="space-y-6 p-4">
            {/* البطاقة الرئيسية */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailCardItem
                  label="رمز الدولة"
                  value={university.countryCode}
                />
                <DetailCardItem
                  label="نوع المؤسسة"
                  value={
                    university.institutionType === "university"
                      ? "جامعة"
                      : university.institutionType === "school"
                      ? "مدرسة"
                      : "أكاديمية"
                  }
                />

                <DetailCardItem label="اسم الجامعة" value={university.name} />
                <DetailCardItem
                  label="الرمز"
                  value={university.code ?? "غير محدد"}
                />
                <DetailCardItem
                  label="الموقع"
                  value={
                    university.city && university.region
                      ? `${university.city}، ${university.region}`
                      : "غير محدد"
                  }
                />
                <DetailCardItem
                  label="الحالة"
                  value={
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        university.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      )}
                    >
                      {university.isActive ? "نشط" : "غير نشط"}
                    </span>
                  }
                />
              </div>
            </div>

            {/* قسم التخصصات */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                التخصصات ({university.majors.length})
              </h3>

              {university.majors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {university.majors.map((major) => (
                    <div
                      key={major.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {major.name}
                      </h4>
                      <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-300">
                        <span>عدد المواد: {major._count?.subjects ?? 0}</span>
                        <span>{major.code ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  لا توجد تخصصات مسجلة
                </div>
              )}
            </div>

            {/* معلومات إضافية */}
            <div className="text-sm text-gray-500 dark:text-gray-400 text-left">
              <p>
                تاريخ الإنشاء:{" "}
                {new Date(university.createdAt).toLocaleDateString("ar-SA")}
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailCardItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </h4>
      <div className="text-base font-semibold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

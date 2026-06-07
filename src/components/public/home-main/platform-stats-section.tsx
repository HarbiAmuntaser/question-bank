// file: src/components/public/home-main/platform-stats-section.tsx

import { BarChart3, BookOpen, Building2, ClipboardCheck, Layers3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export type PlatformStatsSnapshot = {
  totalUniversities?: number | null;
  totalMajors?: number | null;
  totalSubjects?: number | null;
  totalQuizzes?: number | null;
  totalAttempts?: number | null;
};

type AvailableStat = {
  label: string;
  value: number;
  description: string;
  Icon: typeof Building2;
};

function isAvailableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function PlatformStatsSection({ stats }: { stats: PlatformStatsSnapshot | null }) {
  const nf = new Intl.NumberFormat("ar-SA");

  const rawItems = [
    {
      label: "الجامعات",
      value: stats?.totalUniversities,
      description: "جهات تعليمية يمكن البدء منها.",
      Icon: Building2,
    },
    {
      label: "التخصصات",
      value: stats?.totalMajors,
      description: "مسارات أكاديمية مرتبطة بالمؤسسات.",
      Icon: Layers3,
    },
    {
      label: "المواد",
      value: stats?.totalSubjects,
      description: "مواد ومقررات جاهزة للمراجعة.",
      Icon: BookOpen,
    },
    {
      label: "الاختبارات",
      value: stats?.totalQuizzes,
      description: "اختبارات تدريبية متاحة للطلاب.",
      Icon: ClipboardCheck,
    },
    {
      label: "محاولات الاختبار",
      value: stats?.totalAttempts,
      description: "محاولات محفوظة من تجربة الطلاب.",
      Icon: BarChart3,
    },
  ];

  const items: AvailableStat[] = rawItems.flatMap((item) =>
    isAvailableNumber(item.value) ? [{ ...item, value: item.value }] : [],
  );

  if (items.length === 0) return null;

  return (
    <section className="py-8 sm:py-12" aria-labelledby="platform-stats-heading">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-card/95 p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-primary">إحصائيات حقيقية</p>
            <h2 id="platform-stats-heading" className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
              إحصائيات المنصة
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              أرقام من بيانات المنصة المتاحة حاليًا، بدون عرض أي قيمة غير موجودة
              في مصدر البيانات.
            </p>
          </div>
          <span className="w-fit rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            يتم تحديثها من قاعدة البيانات
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {items.map(({ label, value, description, Icon }) => (
            <Card key={label} className="border bg-background shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    بيانات فعلية
                  </span>
                </div>
                <div className="text-3xl font-extrabold leading-none text-foreground">
                  {nf.format(value)}
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}

// file: src/components/public/home-main/path-selection-section.tsx

import Link from "next/link";
import { ArrowLeft, Building2, GraduationCap, School } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PathCard = {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  Icon: typeof Building2;
};

export function PathSelectionSection({ cc }: { cc: string }) {
  const paths: PathCard[] = [
    {
      title: "الجامعات",
      description: "اختبارات مرتبة حسب الجامعة، التخصص، والمقرر.",
      buttonLabel: "استعرض الجامعات",
      href: `/${cc}/university`,
      Icon: Building2,
    },
    {
      title: "الاختبارات الوزارية / المدارس",
      description: "نماذج تدريبية منظمة حسب الصف والمادة.",
      buttonLabel: "استعرض الاختبارات الوزارية",
      href: `/${cc}/school`,
      Icon: School,
    },
    {
      title: "الأكاديميات",
      description: "اختبارات تدريبية ومهنية يمكن التوسع فيها لاحقًا.",
      buttonLabel: "استعرض الأكاديميات",
      href: `/${cc}/academy`,
      Icon: GraduationCap,
    },
  ];

  return (
    <section className="py-8 sm:py-12" aria-labelledby="learning-paths-heading">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-3xl sm:mb-8">
          <p className="text-sm font-semibold text-primary">مسارات المحتوى</p>
          <h2 id="learning-paths-heading" className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            اختر مسارك
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
            اختر نقطة البداية المناسبة لك، ثم انتقل إلى المحتوى التعليمي والاختبارات
            حسب المسار الذي يناسب مرحلتك.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 xl:gap-6">
          {paths.map(({ title, description, buttonLabel, href, Icon }) => (
            <Card
              key={href}
              className="group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80"
            >
              <CardContent className="flex h-full flex-col p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/50" aria-hidden />
                </div>

                <h3 className="text-xl font-bold leading-snug text-foreground">
                  {title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
                  {description}
                </p>

                <Button asChild variant="outline" className="mt-6 h-11 w-full rounded-lg">
                  <Link href={href} prefetch={false} className="flex items-center justify-center gap-2">
                    {buttonLabel}
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

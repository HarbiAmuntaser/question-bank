// file: src/components/public/home-main/how-it-works-section.tsx

import { BookOpenCheck, Building2, ClipboardCheck, Layers3 } from "lucide-react";

const STEPS = [
  {
    title: "اختر الجهة التعليمية",
    description: "ابدأ من الجامعة، المدرسة، أو الأكاديمية المناسبة لمسارك.",
    Icon: Building2,
  },
  {
    title: "اختر التخصص أو الصف",
    description: "انتقل إلى المسار الدراسي الذي تريد مراجعته.",
    Icon: Layers3,
  },
  {
    title: "اختر المادة",
    description: "افتح المادة المطلوبة وشاهد الاختبارات المتاحة لها.",
    Icon: BookOpenCheck,
  },
  {
    title: "ابدأ الاختبار وشاهد نتيجتك",
    description: "تدرّب مباشرة ثم راجع نتيجتك ونقاط التحسين.",
    Icon: ClipboardCheck,
  },
];

export function HowItWorksSection() {
  return (
    <section className="container py-8 sm:py-12" aria-labelledby="how-it-works-heading">
      <div className="grid gap-6 rounded-2xl border bg-muted/25 p-5 shadow-sm sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8 lg:p-8">
        <div className="lg:border-l lg:pl-8">
          <p className="text-sm font-semibold text-primary">رحلة الطالب</p>
          <h2 id="how-it-works-heading" className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            كيف يعمل الموقع؟
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
            خطوات واضحة تقود الطالب من اختيار الجهة التعليمية إلى بدء الاختبار
            ومراجعة النتيجة.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ title, description, Icon }, index) => (
            <div
              key={title}
              className="relative overflow-hidden rounded-xl border bg-background p-4 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {index + 1}
                </span>
              </div>

              <h3 className="text-base font-bold leading-snug text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>

              <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-primary/20" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم"
      title="التواصل مع مستواك"
      description="ستظهر قنوات التواصل الرسمية هنا عند اعتمادها."
      width="narrow"
    >
      <StaticSectionCard
        title="قنوات التواصل قريبا"
        description="تمت إزالة بيانات التواصل غير المفعلة حتى لا يرسل الطالب إلى جهة خاطئة."
      >
        <div className="space-y-5 text-base leading-8 text-muted-foreground">
          <p>
            لا تحتوي هذه الصفحة حاليا على نموذج تواصل أو بريد أو رقم هاتف لأن القنوات الرسمية لم يتم تفعيلها بعد. سنعرض
            وسائل التواصل المعتمدة هنا عند إطلاقها.
          </p>
          <p>حتى ذلك الوقت، يمكنك مراجعة مركز المساعدة والأسئلة الشائعة لمعرفة طريقة استخدام المنصة والاشتراكات.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild className="h-11">
              <Link href="/public/help">مركز المساعدة</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link href="/public/faq">الأسئلة الشائعة</Link>
            </Button>
          </div>
        </div>
      </StaticSectionCard>
    </StaticPageShell>
  );
}

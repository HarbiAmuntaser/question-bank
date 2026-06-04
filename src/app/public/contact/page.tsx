
import type { Metadata } from "next";
import Link from "next/link";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "التواصل | مستواك",
  description:
    "تعرف على قنوات التواصل الرسمية لمنصة مستواك، وراجع مركز المساعدة والأسئلة الشائعة للحصول على إرشادات استخدام المنصة.",
  alternates: {
    canonical: "/public/contact",
  },
  openGraph: {
    title: "التواصل | مستواك",
    description:
      "صفحة التواصل الرسمية لمنصة مستواك، وسيتم تحديثها عند اعتماد قنوات الدعم والتواصل الرسمية.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "التواصل | مستواك",
    description: "قنوات التواصل الرسمية لمنصة مستواك ستتوفر هنا عند اعتمادها.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم"
      title="التواصل مع مستواك"
      description="ستتوفر قنوات التواصل الرسمية هنا عند اعتمادها، مع توجيهك حاليًا إلى مركز المساعدة والأسئلة الشائعة."
      width="narrow"
    >
      <StaticSectionCard
        title="قنوات التواصل الرسمية قريبًا"
        description="نعمل على اعتماد قنوات تواصل واضحة وموثوقة، وسيتم عرضها هنا فور تفعيلها."
      >
        <div className="space-y-5 text-base leading-8 text-muted-foreground">
          <p>
            لا تحتوي هذه الصفحة حاليًا على نموذج تواصل أو بريد إلكتروني أو رقم هاتف؛ لأن قنوات التواصل الرسمية لم يتم
            اعتمادها بعد. نفضّل عدم عرض أي بيانات غير مفعّلة حتى لا يتم توجيه المستخدمين إلى جهة خاطئة أو وسيلة غير
            رسمية.
          </p>

          <p>
            عند إطلاق قنوات الدعم الرسمية لمنصة مستواك، سيتم توضيحها في هذه الصفحة بشكل مباشر، مثل البريد الإلكتروني
            الرسمي أو روابط التواصل المعتمدة، مع تحديث صفحات السياسات عند الحاجة.
          </p>

          <p>
            إلى ذلك الوقت، يمكنك مراجعة مركز المساعدة والأسئلة الشائعة لمعرفة طريقة استخدام المنصة، الوصول إلى
            الاختبارات، وفهم آلية الاشتراكات اليدوية وأكواد الوصول.
          </p>

          <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
            <p>
              تنبيه: لا تعتمد مستواك حاليًا على أي رقم أو بريد منشور خارج الموقع ما لم يتم الإعلان عنه بوضوح داخل
              هذه الصفحة أو في صفحة رسمية أخرى ضمن نطاق{" "}
              <span dir="ltr" className="whitespace-nowrap font-medium text-foreground">
                mustawak.com
              </span>
              .
            </p>
          </div>

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


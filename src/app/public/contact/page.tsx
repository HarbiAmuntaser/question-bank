import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenCheck,
  Bug,
  Clock3,
  CreditCard,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";

import { StaticPageShell } from "@/components/public/static-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "التواصل",
  description:
    "تواصل مع فريق منصة مستواك للاستفسار عن المحتوى التعليمي، الاشتراكات، المشكلات التقنية، أو إرسال الملاحظات والاقتراحات.",
  alternates: {
    canonical: "/public/contact",
  },
  openGraph: {
    title: "التواصل مع مستواك",
    description:
      "قنوات التواصل الرسمية مع منصة مستواك للمساعدة في المحتوى التعليمي والاشتراكات والمشكلات التقنية.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "التواصل مع مستواك",
    description: "قنوات التواصل الرسمية مع منصة مستواك والدعم المتاح للمستخدمين.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const supportTopics = [
  {
    title: "ملاحظة على المحتوى",
    description: "للإبلاغ عن سؤال أو إجابة أو ملخص يحتاج إلى مراجعة.",
    icon: BookOpenCheck,
  },
  {
    title: "الاشتراكات والوصول",
    description: "للاستفسار عن تفعيل كود وصول أو مشكلة في فتح محتوى مشترك.",
    icon: CreditCard,
  },
  {
    title: "مشكلة تقنية",
    description: "للإبلاغ عن خلل في صفحة أو اختبار أو وظيفة داخل المنصة.",
    icon: Bug,
  },
] as const;

export default function ContactPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم والتواصل"
      title="تواصل مع مستواك"
      description="نستقبل استفساراتك وملاحظاتك حول المحتوى التعليمي والاشتراكات وتجربة استخدام المنصة عبر القنوات الرسمية الموضحة هنا."
      width="wide"
    >
      <section aria-labelledby="contact-channels-heading">
        <div className="mb-5">
          <h2 id="contact-channels-heading" className="text-2xl font-bold text-foreground">
            قنوات التواصل
          </h2>
          <p className="mt-2 text-base font-medium leading-7 text-foreground/75">
            سيتم تفعيل الروابط المباشرة بعد اعتماد رقم واتساب وحساب تليجرام الرسميين.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-lg border-border/70 shadow-sm">
            <CardHeader className="flex-row items-start gap-4 space-y-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-lg">واتساب</CardTitle>
                <CardDescription className="font-medium leading-6">
                  للاستفسارات السريعة ومتابعة الاشتراكات والمشكلات العامة.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="inline-flex min-h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold text-foreground/75">
                سيتم إضافة الرقم الرسمي
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border/70 shadow-sm">
            <CardHeader className="flex-row items-start gap-4 space-y-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                <Send className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-lg">تليجرام</CardTitle>
                <CardDescription className="font-medium leading-6">
                  لإرسال الملاحظات والتفاصيل التي تحتاج إلى متابعة منظمة.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="inline-flex min-h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold text-foreground/75">
                سيتم إضافة الحساب الرسمي
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t pt-6" aria-labelledby="support-topics-heading">
        <div className="mb-5">
          <h2 id="support-topics-heading" className="text-2xl font-bold text-foreground">
            كيف يمكننا مساعدتك؟
          </h2>
          <p className="mt-2 text-base font-medium leading-7 text-foreground/75">
            تحديد نوع الطلب وإرسال معلومات واضحة يساعدان على مراجعته بصورة أسرع.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {supportTopics.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-lg border border-border/70 bg-card p-5 shadow-sm">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-7 text-foreground/75">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 border-t pt-6 lg:grid-cols-2" aria-label="إرشادات التواصل">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-bold text-foreground">قبل إرسال طلبك</h2>
          </div>
          <ul className="space-y-3 text-base font-medium leading-7 text-foreground/80">
            <li>اذكر رابط الصفحة أو اسم الاختبار أو الملخص المرتبط بالملاحظة.</li>
            <li>اشرح المشكلة باختصار، وأرفق صورة للشاشة عند الحاجة.</li>
            <li>في مشاكل الاشتراك، اذكر وسيلة التواصل المستخدمة دون نشر الكود علنًا.</li>
          </ul>
          <p className="text-sm font-medium leading-7 text-foreground/70">
            قد يختلف وقت الرد حسب نوع الطلب وعدد الطلبات؛ قنوات التواصل ليست خدمة رد فوري.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xl font-bold">حماية بياناتك</h2>
          </div>
          <p className="mt-4 text-base font-medium leading-8 text-foreground/80">
            لا ترسل كلمة مرور أو بيانات دفع أو رموز تحقق. اعتمد فقط القنوات التي تظهر في هذه الصفحة ضمن نطاق{" "}
            <span dir="ltr" className="whitespace-nowrap font-semibold text-foreground">
              mustawak.com
            </span>
            .
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">هل تبحث عن إجابة سريعة؟</h2>
          <p className="mt-2 text-sm font-medium leading-7 text-foreground/75">
            قد تجد الحل مباشرة في مركز المساعدة أو الأسئلة الشائعة.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11">
            <Link href="/public/help">مركز المساعدة</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/public/faq">الأسئلة الشائعة</Link>
          </Button>
        </div>
      </section>
    </StaticPageShell>
  );
}

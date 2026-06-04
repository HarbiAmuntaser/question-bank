
import type { Metadata } from "next";
import Link from "next/link";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "مركز المساعدة | مستواك",
  description:
    "إرشادات مختصرة تساعدك على استخدام منصة مستواك، الوصول إلى الاختبارات، فهم الاشتراكات اليدوية، ومراجعة الأسئلة الشائعة.",
  alternates: {
    canonical: "/public/help",
  },
  openGraph: {
    title: "مركز المساعدة | مستواك",
    description:
      "دليل مختصر لاستخدام منصة مستواك والوصول إلى الاختبارات وفهم المحتوى المجاني والمدفوع.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "مركز المساعدة | مستواك",
    description: "إرشادات تساعدك على استخدام مستواك والوصول إلى الاختبارات المناسبة.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HelpCenterPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم"
      title="مركز المساعدة"
      description="إرشادات مختصرة تساعدك على استخدام مستواك والوصول إلى الاختبارات المناسبة وفهم آلية الاشتراكات."
      width="wide"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <StaticSectionCard
          title="إرشادات سريعة"
          description="خطوات عملية لحل أكثر الأسئلة شيوعًا قبل استخدام المنصة."
          className="lg:min-h-full"
        >
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                كيف أجد اختبارًا مناسبًا؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                ابدأ من الصفحة الرئيسية، ثم اختر الدولة ونوع الجهة التعليمية. بعد ذلك اختر المؤسسة، ثم التخصص أو
                الصف، ثم المقرر للوصول إلى الاختبارات المتاحة. قد تختلف الاختبارات حسب المحتوى المنشور في كل مقرر.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                كيف أعرف أن الاختبار مجاني أو يحتاج اشتراكًا؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                تظهر شارات أو رسائل واضحة على بطاقات الاختبارات لتوضيح الاختبارات المجانية، والاختبارات التجريبية،
                والمحتوى الذي يتطلب كود اشتراك يدوي. إذا كان الاختبار مقفلًا، ستظهر لك طريقة التفعيل المتاحة.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                هل يتم حفظ نتيجتي؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                قد يتم حفظ محاولة الاختبار ونتيجتها لتحسين التحليلات التعليمية وجودة الأسئلة وتجربة الطالب. لا يحتاج
                الطالب إلى حساب كامل، وقد ترتبط بعض البيانات بجلسة مجهولة محفوظة في المتصفح.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                ماذا أفعل إذا لم يظهر المحتوى بعد التفعيل؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                تأكد من إدخال كود الاشتراك بشكل صحيح، ومن استخدام نفس المتصفح الذي تم التفعيل عليه. إذا استمرت
                المشكلة، يمكن مراجعة صفحة الأسئلة الشائعة، وسيتم توضيح قنوات الدعم الرسمية عند تفعيل صفحة التواصل.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                كيف أبلغ عن مشكلة في سؤال أو اختبار؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                سيتم توضيح قنوات الإبلاغ الرسمية عند اعتماد وسائل التواصل الخاصة بالمنصة. إلى ذلك الوقت، يُنصح
                باستخدام الاختبارات كأداة تدريبية، والرجوع إلى المصادر الرسمية عند وجود اختلاف في الإجابة أو الصياغة.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-center">
            <Link
              href="/public/faq"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              عرض جميع الأسئلة الشائعة
            </Link>
          </div>
        </StaticSectionCard>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b bg-muted/20 p-5 sm:p-6">
            <CardTitle className="text-xl font-bold leading-8">تحتاج مساعدة إضافية؟</CardTitle>
            <CardDescription className="leading-7">
              قنوات التواصل الرسمية ستتوفر قريبًا عبر موقع مستواك.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-5 text-base leading-8 text-muted-foreground sm:p-6">
            <p>
              لا نعرض حاليًا بريدًا إلكترونيًا أو رقم هاتف غير مفعّل. عند اعتماد قنوات الدعم الرسمية، ستظهر هنا بوضوح
              عبر موقع{" "}
              <span dir="ltr" className="whitespace-nowrap font-medium text-foreground">
                mustawak.com
              </span>
              .
            </p>

            <p>
              يمكنك حاليًا الاستفادة من صفحة الأسئلة الشائعة وصفحات السياسات لمعرفة طريقة استخدام المنصة، آلية
              الاشتراكات اليدوية، وحفظ الجلسة المجهولة.
            </p>

            <div className="space-y-3">
              <Button asChild className="h-11 w-full">
                <Link href="/public/contact">انتقل إلى صفحة التواصل</Link>
              </Button>

              <Button asChild variant="outline" className="h-11 w-full">
                <Link href="/public/terms">شروط الاستخدام</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaticPageShell>
  );
}


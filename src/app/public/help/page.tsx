import Link from "next/link";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpCenterPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم"
      title="مركز المساعدة"
      description="إرشادات مختصرة تساعدك على استخدام مستواك والوصول إلى الاختبارات المناسبة."
      width="wide"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <StaticSectionCard
          title="إرشادات سريعة"
          description="خطوات عملية لحل أكثر الأسئلة شيوعا."
          className="lg:min-h-full"
        >
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                كيف أجد اختبارا مناسبا؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                ابدأ من الصفحة الرئيسية، ثم اختر مسارك التعليمي. بعد ذلك اختر المؤسسة، ثم التخصص أو الصف، ثم المادة
                للوصول إلى الاختبارات المتاحة.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                كيف أعرف أن الاختبار مجاني أو يحتاج اشتراكا؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                تظهر شارات واضحة على بطاقات الاختبارات لتوضيح الاختبارات المجانية، والتجارب المجانية، والاختبارات التي
                تتطلب اشتراكا.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                هل يتم حفظ نتيجتي؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                يمكن حفظ محاولة الاختبار ونتيجتها لتحسين التحليلات التعليمية وتجربة الطالب، دون الحاجة إلى حساب طالب.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
                كيف أبلغ عن مشكلة في سؤال؟
              </AccordionTrigger>
              <AccordionContent className="text-base leading-8 text-muted-foreground">
                سيتم توضيح قنوات الإبلاغ الرسمية عند تفعيل صفحة التواصل. حاليا يمكنك مراجعة صفحة الأسئلة الشائعة لمعرفة
                طريقة الاستخدام الصحيحة.
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
            <CardDescription className="leading-7">قنوات التواصل الرسمية ستتوفر قريبا.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5 text-base leading-8 text-muted-foreground sm:p-6">
            <p>لا نعرض حاليا بريدا أو رقما وهميا. عند تفعيل قنوات الدعم الرسمية ستظهر هنا بوضوح عبر موقع مستواك.</p>
            <Button asChild className="h-11 w-full">
              <Link href="/public/contact">انتقل إلى صفحة التواصل</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </StaticPageShell>
  );
}

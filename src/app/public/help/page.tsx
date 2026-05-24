import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"
import { Mail, Phone } from "lucide-react"

export default function HelpCenterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">مركز المساعدة</h1>
          <p className="mt-3 max-w-[700px] mx-auto text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
            ابحث عن إجابات لأسئلتك الشائعة أو اتصل بنا للحصول على الدعم.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">الأسئلة الشائعة</CardTitle>
              <CardDescription>ابحث عن إجابات سريعة لاستفساراتك.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>كيف يمكنني البدء في استخدام بنك الأسئلة؟</AccordionTrigger>
                  <AccordionContent>
                    يمكنك البدء بتصفح الجامعات والتخصصات المتاحة، ثم اختيار الاختبارات التي تناسبك. لا يتطلب الأمر تسجيل
                    دخول للبدء في حل الاختبارات.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>هل يمكنني تتبع تقدمي؟</AccordionTrigger>
                  <AccordionContent>
                    نعم، إذا قمت بتسجيل الدخول، يمكنك الوصول إلى لوحة التحكم الخاصة بك لتتبع أدائك في الاختبارات التي
                    أكملتها.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>هل الأسئلة محدثة؟</AccordionTrigger>
                  <AccordionContent>
                    نحن نعمل باستمرار على تحديث بنك الأسئلة لدينا لضمان دقة واكتمال المحتوى.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>كيف يمكنني الإبلاغ عن خطأ في سؤال؟</AccordionTrigger>
                  <AccordionContent>
                    إذا وجدت خطأ في أي سؤال أو إجابة، يرجى استخدام نموذج &quot;اتصل بنا&quot; أو مراسلتنا عبر البريد
                    الإلكتروني مع تفاصيل السؤال.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="mt-6 text-center">
                <Link href="/faq" className="text-primary hover:underline">
                  عرض جميع الأسئلة الشائعة
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">اتصل بنا</CardTitle>
              <CardDescription>نحن هنا لمساعدتك.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                إذا لم تجد إجابتك في الأسئلة الشائعة، فلا تتردد في التواصل معنا.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Mail className="h-5 w-5" />
                  <span>info@saudibank.edu.sa</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Phone className="h-5 w-5" />
                  <span>+966 11 123 4567</span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/contact">انتقل إلى صفحة الاتصال</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

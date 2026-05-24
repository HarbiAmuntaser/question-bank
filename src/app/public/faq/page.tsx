import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">الأسئلة الشائعة</h1>
          <p className="mt-3 max-w-[700px] mx-auto text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
            كل ما تحتاج معرفته عن بنك الأسئلة السعودي.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">أسئلة عامة</CardTitle>
            <CardDescription>إجابات على الاستفسارات الأكثر شيوعًا.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="general-1">
                <AccordionTrigger>ما هو بنك الأسئلة السعودي؟</AccordionTrigger>
                <AccordionContent>
                  بنك الأسئلة السعودي هو منصة تعليمية شاملة توفر مكتبة واسعة من الأسئلة والاختبارات لطلاب الجامعات
                  السعودية، لمساعدتهم على الاستعداد للاختبارات وتحسين أدائهم الأكاديمي.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="general-2">
                <AccordionTrigger>هل أحتاج إلى حساب لاستخدام المنصة؟</AccordionTrigger>
                <AccordionContent>
                  لا، يمكنك تصفح وحل الاختبارات دون الحاجة إلى إنشاء حساب. ومع ذلك، يتيح لك إنشاء حساب تتبع تقدمك، وحفظ
                  الاختبارات المفضلة، والوصول إلى ميزات إضافية.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="general-3">
                <AccordionTrigger>هل المحتوى مجاني؟</AccordionTrigger>
                <AccordionContent>
                  نعم، جميع الأسئلة والاختبارات المتاحة على المنصة مجانية تمامًا للاستخدام.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="text-2xl">أسئلة تقنية</CardTitle>
            <CardDescription>حلول للمشكلات التقنية الشائعة.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="tech-1">
                <AccordionTrigger>واجهت مشكلة في تحميل صفحة الاختبار، ماذا أفعل؟</AccordionTrigger>
                <AccordionContent>
                  حاول تحديث الصفحة. إذا استمرت المشكلة، تحقق من اتصالك بالإنترنت أو جرب متصفحًا آخر. يمكنك أيضًا مسح
                  ذاكرة التخزين المؤقت وملفات تعريف الارتباط لمتصفحك.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tech-2">
                <AccordionTrigger>هل المنصة متوافقة مع الأجهزة المحمولة؟</AccordionTrigger>
                <AccordionContent>
                  نعم، تم تصميم بنك الأسئلة السعودي ليكون متوافقًا تمامًا مع جميع الأجهزة، بما في ذلك الهواتف الذكية
                  والأجهزة اللوحية.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="text-2xl">أسئلة المحتوى</CardTitle>
            <CardDescription>استفسارات حول جودة ودقة المحتوى.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="content-1">
                <AccordionTrigger>من أين تأتي الأسئلة؟</AccordionTrigger>
                <AccordionContent>
                  يتم جمع الأسئلة من مصادر موثوقة، بما في ذلك المناهج الجامعية، والكتب المرجعية، والاختبارات السابقة،
                  ويتم مراجعتها من قبل خبراء في المجال.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="content-2">
                <AccordionTrigger>كيف يتم ضمان دقة الإجابات؟</AccordionTrigger>
                <AccordionContent>
                  تخضع جميع الأسئلة وإجاباتها لعملية مراجعة دقيقة من قبل فريق من المتخصصين لضمان أعلى مستويات الدقة.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}

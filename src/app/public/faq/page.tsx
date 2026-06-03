import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم"
      title="الأسئلة الشائعة"
      description="إجابات مختصرة حول استخدام مستواك والاختبارات والاشتراكات اليدوية."
      width="wide"
    >
      <StaticSectionCard title="أسئلة عامة" description="أكثر الاستفسارات التي قد يحتاجها الطالب قبل البدء.">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="general-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              ما هي مستواك؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              مستواك منصة تعليمية للتدريب والمراجعة عبر اختبارات منظمة حسب الجامعة أو المدرسة أو الأكاديمية، ثم التخصص
              أو الصف، ثم المادة.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل أحتاج إلى حساب لاستخدام المنصة؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              لا يحتاج الطالب إلى حساب لاستخدام الواجهات العامة أو حل الاختبارات المتاحة. بعض المحتوى قد يحتاج إلى كود
              اشتراك يدوي يتم ربطه بجلسة المتصفح.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-3">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              كيف أبدأ؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              اختر الدولة، ثم نوع الجهة التعليمية، ثم المؤسسة والتخصص أو الصف، وبعدها اختر المادة والاختبار المناسب.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-4">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              لماذا تظهر بعض الاختبارات مقفلة؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              قد تكون بعض المواد أو التخصصات ضمن خطة اشتراك يدوية. ستبقى الاختبارات المجانية أو التجريبية متاحة عند
              تفعيلها من إدارة المنصة.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StaticSectionCard>

      <StaticSectionCard title="الاشتراكات والمحتوى" description="معلومات سريعة عن تفعيل الوصول وجودة المحتوى.">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="subscription-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              كيف أستخدم كود الاشتراك؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              عند ظهور نافذة الاشتراك، أدخل الكود كما وصل إليك ثم اضغط تفعيل. إذا كان الكود صحيحا ونشطا سيتم فتح
              المحتوى المرتبط بنفس المتصفح.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscription-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              ماذا أفعل إذا فقدت الوصول؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              عند توفر قنوات التواصل الرسمية، تواصل معنا مع رقم الكود أو وسيلة التواصل المستخدمة في الطلب حتى يمكن
              مراجعة الحالة.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="content-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل المحتوى رسمي؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              المحتوى في مستواك تدريبي وتعليمي لمساعدة الطالب على المراجعة. يجب الرجوع إلى مصادر المؤسسة التعليمية
              الرسمية عند الحاجة إلى اعتماد نهائي.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="content-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل تعمل مستواك على الجوال؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              نعم، تم تصميم الواجهات العامة لتعمل على الجوال والتابلت وسطح المكتب مع دعم كامل للغة العربية واتجاه RTL.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StaticSectionCard>
    </StaticPageShell>
  );
}

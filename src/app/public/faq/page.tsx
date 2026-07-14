
import type { Metadata } from "next";
import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "إجابات مختصرة عن استخدام منصة مستواك، طريقة الوصول إلى الاختبارات، الاشتراكات اليدوية، المحتوى التعليمي، وفقدان الوصول.",
  alternates: {
    canonical: "/public/faq",
  },
  openGraph: {
    title: "الأسئلة الشائعة | مستواك",
    description:
      "تعرف على إجابات الأسئلة الشائعة حول منصة مستواك والاختبارات والاشتراكات اليدوية وطريقة استخدام المحتوى التعليمي.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "الأسئلة الشائعة | مستواك",
    description: "إجابات مختصرة حول استخدام مستواك والاختبارات والاشتراكات اليدوية.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FAQPage() {
  return (
    <StaticPageShell
      eyebrow="الدعم"
      title="الأسئلة الشائعة"
      description="إجابات مختصرة حول استخدام مستواك والاختبارات والمحتوى التعليمي والاشتراكات اليدوية."
      width="wide"
    >
      <StaticSectionCard title="أسئلة عامة" description="معلومات أساسية تساعدك على فهم طريقة عمل المنصة قبل البدء.">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="general-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              ما هي منصة مستواك؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              مستواك منصة تعليمية تساعد الطلاب على التدريب والمراجعة من خلال اختبارات منظمة حسب الدولة، ونوع الجهة
              التعليمية، والمؤسسة، والتخصص أو الصف، ثم المقرر والاختبار.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل مستواك منصة رسمية تابعة لجامعة أو وزارة؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              لا. مستواك منصة تعليمية مستقلة تهدف إلى مساعدة الطلاب على التدريب وقياس الجاهزية. يجب الرجوع إلى المصادر
              الرسمية للجامعة أو المدرسة أو الجهة التعليمية عند الحاجة إلى اعتماد نهائي.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-3">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل أحتاج إلى حساب لاستخدام المنصة؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              لا يحتاج الطالب إلى إنشاء حساب لاستخدام الواجهات العامة أو حل الاختبارات المتاحة. بعض المحتوى قد يحتاج
              إلى كود اشتراك يدوي يتم ربطه بجلسة المتصفح.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-4">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              كيف أبدأ استخدام مستواك؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              اختر الدولة، ثم نوع الجهة التعليمية، ثم المؤسسة، وبعد ذلك اختر التخصص أو الصف، ثم المقرر والاختبار
              المناسب. ستظهر لك الاختبارات المتاحة حسب المحتوى المنشور في المنصة.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="general-5">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل تعمل المنصة على الجوال؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              نعم، صُممت واجهات مستواك لتعمل على الجوال والتابلت وسطح المكتب، مع دعم اللغة العربية واتجاه الكتابة من
              اليمين إلى اليسار.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StaticSectionCard>

      <StaticSectionCard title="الاختبارات والنتائج" description="أسئلة متعلقة بحل الاختبارات وفهم النتائج.">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="quiz-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل نتائج الاختبارات رسمية؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              لا. نتائج الاختبارات داخل مستواك هي نتائج تدريبية تساعدك على معرفة مستوى جاهزيتك، ولا تُعد شهادة أو نتيجة
              رسمية معتمدة من أي جهة تعليمية.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quiz-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل يمكنني مراجعة إجاباتي بعد الاختبار؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              عند توفر خاصية المراجعة في الاختبار، يمكنك الاطلاع على إجاباتك والنتيجة بعد التسليم. قد تختلف تفاصيل
              المراجعة حسب نوع الاختبار وطريقة إعداده داخل المنصة.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quiz-3">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              لماذا لا أجد اختبارًا لمقرر معين؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              قد لا يكون المحتوى قد أُضيف بعد لذلك المقرر، أو قد يكون غير منشور حاليًا. يتم تحديث المحتوى تدريجيًا حسب
              توفر الأسئلة والاختبارات المناسبة.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quiz-4">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل كل الإجابات مضمونة الصحة؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              نبذل جهدًا لتحسين جودة الأسئلة والإجابات، لكن قد تحدث أخطاء أو تحديثات في المحتوى. لذلك يُنصح باستخدام
              المنصة كأداة تدريب ومراجعة، والرجوع إلى المصادر الرسمية عند الحاجة.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StaticSectionCard>

      <StaticSectionCard title="الاشتراكات والمحتوى المدفوع" description="معلومات سريعة عن أكواد الاشتراك والوصول.">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="subscription-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              لماذا تظهر بعض الاختبارات مقفلة؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              قد تكون بعض الاختبارات أو المقررات أو التخصصات ضمن خطة اشتراك يدوية. ستبقى الاختبارات المجانية أو
              التجريبية متاحة إذا تم تفعيلها من إدارة المنصة.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscription-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              كيف أستخدم كود الاشتراك؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              عند ظهور نافذة الاشتراك، أدخل الكود كما وصل إليك ثم اضغط تفعيل. إذا كان الكود صحيحًا ونشطًا، سيتم فتح
              المحتوى المرتبط به على نفس المتصفح.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscription-3">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل يرتبط الاشتراك بحساب؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              حاليًا لا يحتاج الطالب إلى حساب كامل. يتم ربط الوصول غالبًا بجلسة مجهولة محفوظة في المتصفح، لذلك قد
              يتأثر الوصول عند تغيير المتصفح أو حذف ملفات الارتباط.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscription-4">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              ماذا أفعل إذا فقدت الوصول؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              عند توفر قنوات التواصل الرسمية، يمكنك التواصل معنا مع رقم الكود أو وسيلة التواصل المستخدمة في طلب
              الاشتراك حتى يمكن مراجعة الحالة والتحقق منها.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StaticSectionCard>

      <StaticSectionCard title="الدعم والتواصل" description="معلومات حول التواصل وتحديثات المنصة.">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="support-1">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              كيف أتواصل مع مستواك؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              ستتوفر قنوات التواصل الرسمية عبر موقع مستواك عند إطلاقها. لا نعتمد حاليًا على بريد أو رقم هاتف غير مفعّل
              داخل صفحات السياسات.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="support-2">
            <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">
              هل يتم تحديث المحتوى باستمرار؟
            </AccordionTrigger>
            <AccordionContent className="text-base leading-8 text-muted-foreground">
              نعم، يمكن تحديث المحتوى وإضافة مؤسسات أو تخصصات أو مقررات أو اختبارات جديدة بشكل تدريجي حسب توفر
              المحتوى واعتماده داخل لوحة الإدارة.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StaticSectionCard>
    </StaticPageShell>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { OFFICIAL_SUPPORT_EMAIL } from "@/config/public-support";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description: "إجابات عن حساب مستواك والاختبارات والوصول المدفوع والاسترداد والمحتوى.",
  alternates: { canonical: "/public/faq" },
  openGraph: { title: "الأسئلة الشائعة | مستواك", description: "إجابات عملية عن استخدام منصة مستواك.", type: "website" },
  twitter: { card: "summary", title: "الأسئلة الشائعة | مستواك", description: "إجابات عملية عن استخدام منصة مستواك." },
  robots: { index: true, follow: true },
};

function Item({ value, question, children }: { value: string; question: string; children: ReactNode }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-right text-base font-semibold hover:no-underline">{question}</AccordionTrigger>
      <AccordionContent className="text-base leading-8 text-muted-foreground">{children}</AccordionContent>
    </AccordionItem>
  );
}

export default function FAQPage() {
  return (
    <StaticPageShell eyebrow="الدعم" title="الأسئلة الشائعة" description="إجابات مختصرة مبنية على الوظائف المتاحة فعليًا في مستواك." width="wide">
      <StaticSectionCard title="المنصة والحساب" description="طبيعة مستواك وتسجيل الدخول وحفظ نتائج الاختبارات.">
        <Accordion type="multiple" className="w-full">
          <Item value="identity" question="هل مستواك تابعة لجامعة أو جهة رسمية؟">
            لا. مستواك مشروع تعليمي شخصي مستقل. تُستخدم أسماء الجامعات والكليات والمقررات لتنظيم المحتوى فقط، ويظل
            المرجع الرسمي هو الجهة التعليمية.
          </Item>
          <Item value="account" question="هل أحتاج إلى حساب؟">
            يمكن التفعيل بكود كضيف دون حساب، أو تفعيل كود جديد داخل حساب طالب موثق للوصول من أجهزتك بتسجيل الدخول.
            التفعيل كضيف لا ينتقل إلى الحساب تلقائيًا عند تسجيل الدخول لاحقًا.
            قد يتوفر تسجيل الدخول عبر Google عند تشغيله، ولا يربط النظام تلقائيًا بريد Google بحساب كلمة مرور موجود.
          </Item>
          <Item value="results" question="هل تنتقل نتائج الاختبارات بين أجهزتي؟">
            لا حاليًا. تحفظ الواجهة حالة المحاولة وبعض النتائج في تخزين المتصفح المحلي، وقد ترتبط محاولة خادم بجلسة
            مجهولة. لا ترتبط النتائج بحساب الطالب ولا تتزامن بين الأجهزة، وقد تزول عند مسح بيانات المتصفح.
          </Item>
          <Item value="official-results" question="هل النتائج أو المحتوى معتمدان رسميًا؟">
            لا. النتائج تدريبية والمحتوى مساعد للمراجعة، ولا يمثل شهادة أو درجة جامعية ولا يغني عن المصادر الرسمية.
          </Item>
        </Accordion>
      </StaticSectionCard>

      <StaticSectionCard title="الاشتراك والوصول" description="الطلبات والأكواد والاسترداد والمحتوى التجريبي.">
        <Accordion type="multiple" className="w-full">
          <Item value="paid" question="كيف أحصل على محتوى مدفوع؟">
            راجع الخطة والسعر والمدة، ثم اختر طلب كود تفعيل عبر واتساب. بعد الاتفاق والتحقق من الدفع واستلام الكود،
            عد إلى المادة واختر «لدي كود تفعيل أو أريد استعادة الوصول». إرسال الرسالة وحده لا يمنح الوصول.
            إذا كان لديك طلب اشتراك سابق، يمكنك متابعة حالته من صفحة طلباتك.
          </Item>
          <Item value="trial" question="هل لكل خطة فصل تجريبي؟">
            الهدف توفير محتوى تجريبي لكل خطة، لكن ذلك ليس مضمونًا حاليًا لجميع الخطط. اعتمد فقط على المحتوى الذي يظهر
            صراحة كمجاني أو تجريبي في صفحة المقرر.
          </Item>
          <Item value="refund" question="هل يمكن إلغاء الطلب أو استرداد المبلغ؟">
            يمكن إلغاء الطلب قبل تسجيل دفع، ويمكن طلب مراجعة استرداد قبل التفعيل أو بسبب دفع زائد أو مكرر أو فشل
            الخدمة. بعد التفعيل تُراجع الحالة يدويًا؛ لا يوجد استرداد آلي. راجع سياسة الإلغاء والاسترداد.
          </Item>
          <Item value="lost-access" question="ماذا أفعل إذا فقدت الوصول؟">
            سجل الدخول بالحساب نفسه إذا فُعّل الكود داخل حسابك. لوصول الضيف، أدخل الكود من نافذة المادة عند حذف
            ملفات الارتباط أو تغيير المتصفح، ثم اختر النقل إذا بلغ الوصول حد المتصفحات. النقل لا يمدد الاشتراك.
            احتفظ بالكود لنفسك واستخدم متصفحًا عاديًا؛ قد لا يحتفظ التصفح الخاص بالوصول بعد إغلاق جلسته.
          </Item>
        </Accordion>
      </StaticSectionCard>

      <StaticSectionCard title="المحتوى والدعم" description="التصحيح والخصوصية والتواصل الرسمي.">
        <Accordion type="multiple" className="w-full">
          <Item value="content-report" question="كيف أبلغ عن خطأ أو مادة غير مصرح بها؟">
            أرسل رابط الصفحة ووصف المشكلة ومصدرًا داعمًا إلى البريد الرسمي. تمنع سياسة المحتوى المواد المسربة
            والسرية وبيانات الطلاب والمحتوى الذي لا نملك حق استخدامه.
          </Item>
          <Item value="privacy" question="كيف أطلب مراجعة بياناتي أو حذفها؟">
            راسل{" "}
            <a dir="ltr" href={`mailto:${OFFICIAL_SUPPORT_EMAIL}`} className="font-semibold text-primary">
              {OFFICIAL_SUPPORT_EMAIL}
            </a>
            . لا توجد حاليًا أداة حذف ذاتي كاملة، وقد يلزم الاحتفاظ بسجلات مالية أو أمنية أو تدقيقية.
          </Item>
          <Item value="contact" question="هل توجد روابط واتساب أو تيليجرام عامة؟">
            ستضاف بعد اعتمادها رسميًا. قنوات التواصل التي تظهر داخل خطة اشتراك تظل مخصصة لمسار تلك الخطة، والبريد
            الرسمي هو قناة الدعم العامة الحالية.
          </Item>
        </Accordion>
      </StaticSectionCard>
    </StaticPageShell>
  );
}

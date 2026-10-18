import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CircleUserRound, CreditCard, FileWarning } from "lucide-react";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Button } from "@/components/ui/button";
import { OFFICIAL_SUPPORT_EMAIL } from "@/config/public-support";

export const metadata: Metadata = {
  title: "مركز المساعدة",
  description: "إرشادات استخدام مستواك والحساب والاختبارات والاشتراكات والوصول إلى الملفات.",
  alternates: { canonical: "/public/help" },
  openGraph: { title: "مركز المساعدة | مستواك", description: "إرشادات عملية لاستخدام منصة مستواك.", type: "website" },
  twitter: { card: "summary", title: "مركز المساعدة | مستواك", description: "إرشادات عملية لاستخدام منصة مستواك." },
  robots: { index: true, follow: true },
};

const guides = [
  {
    title: "العثور على المحتوى",
    icon: BookOpen,
    steps: [
      "اختر الدولة ونوع الجهة ثم الجامعة أو المسار.",
      "انتقل إلى الكلية - إن وجدت - ثم التخصص والمقرر والفصل.",
      "توضح البطاقة ما إذا كان المحتوى مجانيًا أو يحتاج إلى وصول.",
    ],
  },
  {
    title: "الحساب وتسجيل الدخول",
    icon: CircleUserRound,
    steps: [
      "تحقق من بريدك عند إنشاء الحساب قبل تسجيل الدخول.",
      "استخدم استعادة كلمة المرور إذا فقدتها، ولا ترسلها إلى الدعم.",
      "نتائج الاختبار المحفوظة محليًا لا تنتقل حاليًا بين الأجهزة.",
    ],
  },
  {
    title: "الاشتراك والدفع",
    icon: CreditCard,
    steps: [
      "راجع الخطة والسعر والمدة والمقرر، ثم اختر طلب كود تفعيل عبر واتساب.",
      "بعد التحقق من الدفع واستلام الكود، أدخله في نافذة المادة. إرسال الرسالة وحده لا يمنح الوصول.",
      "فعّل الكود كضيف في المتصفح أو داخل حساب موثق. تظل طلباتك السابقة متاحة للمتابعة من حسابك.",
    ],
  },
  {
    title: "الملفات والوصول",
    icon: FileWarning,
    steps: [
      "سجل الدخول بالحساب الذي فُعّل الكود داخله، أو أدخل كود الضيف للاستعادة أو النقل. تسجيل الدخول لاحقًا لا ينقل وصول الضيف للحساب.",
      "تُفتح الملفات المحمية داخل عارض الموقع بعد فحص الصلاحية.",
      "إذا استمر المنع، أرسل رابط الصفحة ومرجع الطلب دون إرسال أسرار.",
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <StaticPageShell eyebrow="الدعم" title="مركز المساعدة" description="خطوات مختصرة لحل المشكلات الشائعة قبل التواصل مع الدعم." width="wide">
      <div className="grid gap-5 md:grid-cols-2">
        {guides.map(({ title, icon: Icon, steps }) => (
          <StaticSectionCard key={title} title={title} className="h-full">
            <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
            <ol className="list-decimal space-y-3 pe-5 text-base leading-8 text-foreground/80">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </StaticSectionCard>
        ))}
      </div>

      <StaticSectionCard title="عند الحاجة إلى متابعة" description="أرسل معلومات تكفي لفهم المشكلة من دون كشف بيانات حساسة.">
        <div className="space-y-4 text-base leading-8 text-foreground/80">
          <p>
            اذكر رابط الصفحة، واسم المقرر، ووصف الخطأ، ومرجع الطلب عند ارتباط المشكلة بالدفع. لا ترسل كلمة مرور أو
            رمز تحقق أو كود تفعيل كامل أو بيانات دفع حساسة.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href={`mailto:${OFFICIAL_SUPPORT_EMAIL}?subject=${encodeURIComponent("طلب دعم")}`}>مراسلة الدعم بالبريد</a>
            </Button>
            <Button asChild variant="outline"><Link href="/public/faq">الأسئلة الشائعة</Link></Button>
            <Button asChild variant="outline"><Link href="/public/contact">بيانات التواصل</Link></Button>
          </div>
        </div>
      </StaticSectionCard>
    </StaticPageShell>
  );
}

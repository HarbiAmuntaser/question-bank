import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Bug, CreditCard, Mail, ShieldCheck } from "lucide-react";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Button } from "@/components/ui/button";
import { OFFICIAL_SUPPORT_EMAIL } from "@/config/public-support";

export const metadata: Metadata = {
  title: "التواصل",
  description: "البريد الرسمي للتواصل مع مستواك بشأن الدعم والخصوصية والاسترداد والمحتوى.",
  alternates: { canonical: "/public/contact" },
  openGraph: { title: "التواصل مع مستواك", description: "قناة التواصل الرسمية مع منصة مستواك.", type: "website" },
  twitter: { card: "summary", title: "التواصل مع مستواك", description: "قناة التواصل الرسمية مع منصة مستواك." },
  robots: { index: true, follow: true },
};

const topics = [
  { title: "المحتوى والحقوق", description: "خطأ علمي، مادة مسربة، أو بلاغ ملكية فكرية.", icon: BookOpenCheck },
  { title: "الاشتراك والاسترداد", description: "طلب دفع أو وصول أو استرداد يحتاج إلى مراجعة.", icon: CreditCard },
  { title: "الخصوصية والبيانات", description: "مراجعة البيانات أو تصحيحها أو طلب حذفها.", icon: ShieldCheck },
  { title: "مشكلة تقنية", description: "خلل في صفحة أو اختبار أو ملف أو تسجيل الدخول.", icon: Bug },
] as const;

export default function ContactPage() {
  return (
    <StaticPageShell eyebrow="الدعم والتواصل" title="تواصل مع مستواك" description="البريد الرسمي هو قناة الدعم العامة الحالية." width="wide">
      <StaticSectionCard title="البريد الرسمي" description="يستقبل طلبات الدعم والخصوصية وحذف البيانات والملكية الفكرية والاسترداد.">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <a dir="ltr" href={`mailto:${OFFICIAL_SUPPORT_EMAIL}`} className="break-all text-base font-bold text-primary underline-offset-4 hover:underline">
              {OFFICIAL_SUPPORT_EMAIL}
            </a>
          </div>
          <Button asChild><a href={`mailto:${OFFICIAL_SUPPORT_EMAIL}?subject=${encodeURIComponent("طلب دعم من مستواك")}`}>إنشاء رسالة</a></Button>
        </div>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          لم تُعتمد روابط واتساب أو تيليجرام العامة بعد. لا يؤثر ذلك على وسيلة التواصل التي تعرضها خطة اشتراك داخل
          مسار طلبها؛ استخدمها فقط لذلك الطلب.
        </p>
      </StaticSectionCard>

      <section aria-labelledby="contact-topics">
        <h2 id="contact-topics" className="mb-4 text-2xl font-bold">موضوعات الدعم</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {topics.map(({ title, description, icon: Icon }) => (
            <div key={title} className="border-b p-4">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <StaticSectionCard title="معلومات تساعدنا على المراجعة">
        <ul className="list-disc space-y-2 pe-5 text-base leading-8 text-foreground/80">
          <li>رابط الصفحة واسم الجامعة أو المقرر عند ارتباط الطلب بمحتوى.</li>
          <li>مرجع الطلب عند ارتباطه بالدفع، ووصف المبلغ أو المشكلة دون بيانات مصرفية حساسة.</li>
          <li>تفاصيل الحق وصفتك عند إرسال بلاغ ملكية فكرية.</li>
          <li>البريد المرتبط بالحساب عند تقديم طلب خصوصية أو حذف، حتى نتحقق من صاحب الطلب.</li>
        </ul>
        <p className="mt-4 border-r-4 border-amber-500 bg-amber-500/10 px-4 py-3 text-sm leading-7">
          لا ترسل كلمة مرور أو رمز تحقق أو رابط دخول أو كود تفعيل كامل. لا نَعِد بزمن رد ثابت؛ يختلف حسب نوع الطلب
          والمعلومات اللازمة للتحقق.
        </p>
      </StaticSectionCard>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline"><Link href="/public/help">مركز المساعدة</Link></Button>
        <Button asChild variant="outline"><Link href="/public/refund-policy">سياسة الاسترداد</Link></Button>
        <Button asChild variant="outline"><Link href="/public/content-policy">سياسة المحتوى</Link></Button>
      </div>
    </StaticPageShell>
  );
}

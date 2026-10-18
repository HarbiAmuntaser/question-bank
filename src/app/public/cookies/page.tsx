import type { Metadata } from "next";
import Link from "next/link";

import { StaticArticleCard, StaticNotice, StaticPageNav, StaticPageShell } from "@/components/public/static-page-shell";
import { OFFICIAL_SUPPORT_EMAIL } from "@/config/public-support";

const lastUpdated = "17 أكتوبر 2026";

export const metadata: Metadata = {
  title: "سياسة ملفات الارتباط",
  description: "تفاصيل ملفات الارتباط والتخزين المحلي المستخدمة فعليًا في منصة مستواك.",
  alternates: { canonical: "/public/cookies" },
  openGraph: { title: "سياسة ملفات الارتباط | مستواك", description: "ملفات الارتباط والتخزين المحلي المستخدمة لتشغيل مستواك.", type: "website" },
  twitter: { card: "summary", title: "سياسة ملفات الارتباط | مستواك", description: "ملفات الارتباط والتخزين المحلي في مستواك." },
  robots: { index: true, follow: true },
};

const sections = [
  { id: "essential", label: "ملفات ضرورية" },
  { id: "local-storage", label: "التخزين المحلي" },
  { id: "analytics", label: "التحليلات والإعلانات" },
  { id: "controls", label: "إدارة التخزين" },
];

export default function CookiesPolicyPage() {
  return (
    <StaticPageShell eyebrow="السياسات" title="سياسة ملفات الارتباط" description="ما يخزنه مستواك في المتصفح، وسبب استخدامه، وكيف تتحكم فيه." meta={`آخر تحديث: ${lastUpdated}`}>
      <StaticPageNav items={sections} />
      <StaticNotice>
        حذف ملفات الارتباط أو التخزين المحلي قد يسجل خروجك أو يفقد نتيجة محفوظة على الجهاز أو يتطلب استعادة وصول الضيف.
      </StaticNotice>
      <StaticArticleCard>
        <p>
          تستخدم مستواك ملفات ارتباط وتخزين متصفح محدودًا لتشغيل الحساب والوصول والاختبارات والتفضيلات. تختلف أسماء
          ملفات جلسة تسجيل الدخول بحسب بيئة التشغيل وإعداد الأمان، لذلك نصف وظيفتها ومدتها القصوى بدل الاعتماد على اسم واحد.
        </p>

        <h2 id="essential">ملفات الارتباط الضرورية</h2>
        <ul>
          <li><strong>جلسة الحساب:</strong> تحفظ تسجيل الدخول للحساب أو الإدارة، وقد تمتد حتى 30 يومًا ما لم تنتهِ الجلسة أو تسجل الخروج أو تُبطل لأسباب أمنية.</li>
          <li><strong><span dir="ltr">qb_anon_session</span>:</strong> معرف عشوائي لجلسة الضيف، وقد يبقى حتى سنة للمحافظة على الوظائف التي تعتمد على المتصفح.</li>
          <li><strong><span dir="ltr">mw_code_access</span>:</strong> رمز جلسة آمن للوصول الذي فُعّل للضيف، وتنتهي صلاحيته بحسب صلاحية المنحة أو عند إبطال الجلسة.</li>
          <li><strong><span dir="ltr">cc</span> و<span dir="ltr">inst</span>:</strong> يحفظان الدولة ونوع الجهة المختارين، وقد يبقيان حتى سنة.</li>
          <li><strong><span dir="ltr">detected_cc</span>:</strong> يحفظ نتيجة اكتشاف الدولة لمدة تقارب 24 ساعة لتحسين تجربة التوجيه.</li>
        </ul>
        <p>
          تستخدم هذه الملفات خصائص أمان مناسبة حسب نوعها، مثل منع قراءة رموز الجلسة الحساسة من JavaScript عند
          انطباق ذلك. لا ينبغي اعتبار أي ملف ارتباط بديلًا عن كلمة المرور أو مشاركته مع الآخرين.
        </p>

        <h2 id="local-storage">التخزين المحلي للاختبارات والواجهة</h2>
        <p>
          تحفظ الواجهة حالة المحاولة والإجابات وبعض النتائج وإعدادات العرض في <span dir="ltr">localStorage</span>.
          هذا الحفظ محلي في المتصفح ولا يتزامن حاليًا مع حساب الطالب أو أجهزته. لا توجد مدة حذف مركزية موحدة لهذه
          العناصر؛ قد تبقى حتى تستبدلها المنصة أو يحذفها المستخدم أو يمسح المتصفح بيانات الموقع.
        </p>
        <h2 id="analytics">التحليلات والإعلانات</h2>
        <p>
          تستخدم المنصة قياسات أداء وتشغيل عامة عبر خدمات الاستضافة، مثل Vercel Analytics وSpeed Insights، لفهم
          الأداء والأخطاء دون بيع البيانات. قد تعالج هذه الخدمات بيانات تقنية وفق سياساتها.
        </p>
        <p>
          Google AdSense غير مفعّل حاليًا، ولا توجد ملفات ارتباط إعلانية من AdSense محملة من أساس الإعلانات الحالي.
          قبل تشغيله سنحدّث هذه السياسة وسياسة الخصوصية، ونطبق آلية موافقة عندما تتطلب المنطقة أو الأنظمة ذلك. لا
          تستخدم صفحات الإدارة أو الحساب أو الدفع أو المحتوى المدفوع كمساحات إعلانية وفق سياسة الأهلية الحالية.
        </p>

        <h2 id="controls">إدارة ملفات الارتباط والتخزين</h2>
        <p>
          يمكنك حذف بيانات الموقع أو حظرها من إعدادات المتصفح. قد يؤدي ذلك إلى تسجيل الخروج، وفقد تفضيلات الدولة،
          وحذف نتائج اختبار محفوظة محليًا، أو الحاجة إلى استعادة وصول ضيف. تسجيل الدخول بالحساب يعيد الوصول القائم
          المرتبط بالحساب، لكنه لا يعيد نتائج الاختبارات المحلية من جهاز آخر.
        </p>
        <p>
          للمزيد راجع <Link href="/public/privacy">سياسة الخصوصية</Link>. ولأي استفسار تواصل عبر{" "}
          <a dir="ltr" href={`mailto:${OFFICIAL_SUPPORT_EMAIL}`}>{OFFICIAL_SUPPORT_EMAIL}</a>.
        </p>
      </StaticArticleCard>
    </StaticPageShell>
  );
}

import Link from "next/link";

import { StaticPageShell, StaticSectionCard } from "@/components/public/static-page-shell";
import { Button } from "@/components/ui/button";

export default function LeaderboardPage() {
  return (
    <StaticPageShell
      eyebrow="قريبا"
      title="لوحة المتصدرين"
      description="سيتم تفعيل ترتيب المتعلمين لاحقا عند جاهزية بيانات حقيقية."
      width="narrow"
    >
      <StaticSectionCard title="سيتم تفعيل المتصدرين لاحقا" description="لا نعرض بيانات تجريبية أو أسماء وهمية في هذه الصفحة.">
        <div className="space-y-5 text-base leading-8 text-muted-foreground">
          <p>
            ستعتمد لوحة المتصدرين عند إطلاقها على محاولات الاختبار والنتائج الحقيقية داخل مستواك، مع مراعاة الخصوصية
            ووضوح مصدر البيانات.
          </p>
          <p>يمكنك حاليا استخدام الاختبارات المتاحة ومراجعة نتيجتك بعد التسليم.</p>

          <Button asChild className="h-11">
            <Link href="/SA">العودة إلى الصفحة الرئيسية</Link>
          </Button>
        </div>
      </StaticSectionCard>
    </StaticPageShell>
  );
}

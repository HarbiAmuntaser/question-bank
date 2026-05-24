import { PublicHeader } from "@/components/public/public-header/public-header";
import { PublicFooter } from "@/components/public/public-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">سياسة الخصوصية</h1>
          <p className="mt-3 max-w-[700px] mx-auto text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
            كيف نقوم بجمع واستخدام وحماية معلوماتك.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">مقدمة</CardTitle>
            <CardDescription>توضح هذه السياسة كيفية تعاملنا مع بياناتك.</CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p>
              نحن في بنك الأسئلة السعودي نلتزم بحماية خصوصية مستخدمينا. توضح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا
              والكشف عن معلوماتك الشخصية عند استخدامك لمنصتنا.
            </p>
            <h2>المعلومات التي نجمعها</h2>
            <p>قد نقوم بجمع أنواع مختلفة من المعلومات منك، بما في ذلك:</p>
            <ul>
              <li>
                <strong>المعلومات الشخصية:</strong> مثل اسمك، عنوان بريدك الإلكتروني، ومعلومات الاتصال الأخرى التي
                تقدمها عند إنشاء حساب أو التواصل معنا.
              </li>
              <li>
                <strong>بيانات الاستخدام:</strong> معلومات حول كيفية وصولك إلى المنصة واستخدامها، مثل عنوان IP الخاص بك،
                نوع المتصفح، الصفحات التي تزورها، والوقت الذي تقضيه على تلك الصفحات.
              </li>
              <li>
                <strong>بيانات الاختبار:</strong> إجاباتك على الأسئلة، ونتائج الاختبارات، والتقدم المحرز في التعلم.
              </li>
            </ul>
            <h2>كيف نستخدم معلوماتك</h2>
            <p>نستخدم المعلومات التي نجمعها لأغراض مختلفة، بما في ذلك:</p>
            <ul>
              <li>توفير وتحسين خدماتنا.</li>
              <li>تخصيص تجربتك على المنصة.</li>
              <li>تحليل الاستخدام والاتجاهات لتحسين وظائف المنصة.</li>
              <li>التواصل معك بشأن التحديثات والعروض الترويجية (إذا وافقت على ذلك).</li>
              <li>ضمان أمان وسلامة المنصة.</li>
            </ul>
            <h2>مشاركة المعلومات</h2>
            <p>نحن لا نبيع أو نتاجر أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك مع:</p>
            <ul>
              <li>مقدمي الخدمات الذين يساعدوننا في تشغيل المنصة (مثل استضافة البيانات).</li>
              <li>الجهات الحكومية أو القانونية إذا كان ذلك مطلوبًا بموجب القانون.</li>
            </ul>
            <h2>أمان البيانات</h2>
            <p>
              نتخذ تدابير أمنية معقولة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الكشف أو التدمير.
              ومع ذلك، لا توجد طريقة نقل عبر الإنترنت أو طريقة تخزين إلكتروني آمنة بنسبة 100%.
            </p>
            <h2>حقوقك</h2>
            <p>
              لديك الحق في الوصول إلى معلوماتك الشخصية التي نحتفظ بها، وتصحيحها، وتحديثها، أو طلب حذفها. يرجى الاتصال
              بنا إذا كنت ترغب في ممارسة هذه الحقوق.
            </p>
            <h2>التغييرات على سياسة الخصوصية</h2>
            <p>
              قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإعلامك بأي تغييرات عن طريق نشر السياسة الجديدة على
              هذه الصفحة.
            </p>
            <h2>اتصل بنا</h2>
            <p>إذا كانت لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا عبر:</p>
            <p>البريد الإلكتروني: info@saudibank.edu.sa</p>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}

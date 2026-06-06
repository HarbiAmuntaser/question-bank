// src/app/admin/quiz-generator/page.tsx
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizGenerator } from "@/components/admin/quizzes/generator/quiz-generator";

export default function QuizGeneratorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">مولد الاختبارات</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">إنشاء اختبارات تفاعلية في مستواك</p>
      </div>

      <Suspense fallback={<div>جاري التحميل...</div>}>
        <QuizGenerator />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>نصائح لإنشاء اختبار فعال</CardTitle>
          <CardDescription>أفكار تساعدك على بناء اختبار متوازن</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• اختر مزيجًا من مستويات الصعوبة</li>
            <li>• تأكّد من تغطية الفصول المهمة</li>
            <li>• نوّع أنواع الأسئلة</li>
            <li>• حدّد وقتًا مناسبًا للاختبار</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

# Python Chapter 1 Validation Report

هذا التقرير يخص ملفات `_artifacts/python-chapter-1-pilot` بعد تصحيح Fidelity.

## HTML Validation

| الفحص | النتيجة |
| --- | --- |
| لا يوجد `h1` داخل `contentHtml` | Passed |
| يبدأ المحتوى بمقدمة مباشرة ثم `h2` | Passed |
| يوجد `h2` | Passed |
| عدد عناصر `<pre` | `30` |
| عدد عناصر `<pre dir="ltr"` | `30` |
| كل عناصر `pre` تحمل `dir="ltr"` | Passed |
| لا يوجد `<style>` | Passed |
| لا يوجد `style=` | Passed |
| لا يوجد HTML `class=` attribute | Passed |
| لا يوجد `<script>` | Passed |
| لا يوجد `<iframe>` | Passed |
| توجد `None` داخل HTML | Passed |
| توجد أقسام `int()` و`float()` و`str()` و`bool()` | Passed |
| توجد جملة سبب استخدام `print()` | Passed |
| التمرين الخامس يستخدم `print(type(...))` | Passed |
| وصف `int(float)` مصحح إلى الاقتطاع باتجاه الصفر | Passed |
| رابط الاختبار النسبي موجود | Passed: `../quizzes/python-variables-quiz` |
| لا يوجد `[QUIZ_URL]` أو `[SUMMARY_URL]` داخل HTML | Passed |
| لا يوجد `12 - completed_lessons` | Passed |
| لا يوجد `score >= 60` | Passed |
| لا يوجد `a + str(b)` | Passed |
| لا يوجد سطر كود bare يبدأ بـ `type(` داخل HTML | Passed |
| أمثلة `bool()` التي يراد عرض نتائجها تستخدم `print(bool(...))` | Passed |
| لا يوجد bare `bool(...)` داخل كتل أمثلة التحويل إلى `bool` | Passed |

ملاحظة: يوجد `class = "Python"` داخل كتلة كود معتمدة تشرح خطأ استخدام كلمة محجوزة، وليس HTML `class` attribute.

## Final QA Corrections

هذه التصحيحات الثلاثة محدودة ومصرح بها صراحة، وليست إعادة صياغة للحزمة:

- السؤال 15: استبدال مشتت `يجب استخدام == بدل =` بـ`يجب كتابة اسم المتغير بين علامتي اقتباس`.
- السؤال 8: تصحيح تنسيق `None` داخل Explanation.
- HTML: استخدام `print(bool(...))` في أمثلة التحويل إلى `bool` التي يراد عرض نتائجها.

نتيجة فحص Final QA المحلي:

```json
{
  "counts": {
    "total": 20,
    "mcq": 16,
    "tf": 4,
    "easy": 8,
    "medium": 8,
    "hard": 4
  },
  "noDoubleEqualsInQuestionTextOrOptions": true,
  "q15NewDistractorExists": true,
  "q15OldDistractorRemoved": true,
  "q15CorrectStillFourth": true,
  "q8NoneFormattingFixed": true,
  "boolConversionUsesPrint": true,
  "hasPrintBoolFalse": true,
  "pre": 30,
  "preLtr": 30,
  "htmlHasH1": false
}
```

## JSON / Zod Validation

Zod validation عبر `src/validations/question-import.ts`:

```json
{
  "success": true,
  "errors": null
}
```

| الفحص | النتيجة |
| --- | --- |
| عدد الأسئلة | `20` |
| `multiple_choice` | `16` |
| `true_false` | `4` |
| `easy` | `8` |
| `medium` | `8` |
| `hard` | `4` |
| السؤال 1 يستخدم Tags المصححة | Passed: `المتغيرات`, `الإسناد` |
| السؤال 2 يستخدم المشتت `=>` بدل `==` | Passed |
| السؤال 18 يستخدم المتغير `result` | Passed |
| السؤال 20 هو سؤال true/false المصحح | Passed |
| كل Tags من القاموس العربي المعتمد | Passed |
| لا توجد Tags إنجليزية غير معتمدة | Passed |
| لا يوجد تكرار في `questionText` | Passed |
| لكل MCQ إجابة صحيحة واحدة فقط | Passed |
| كل أسئلة true_false تستخدم `tfAnswer` Boolean | Passed |
| لا يوجد `correctAnswer` داخل payload النهائي | Passed |
| لا يوجد `==` داخل أي `questionText` أو option | Passed |
| Explanation السؤال 8 يبدأ بـ `` `None` `` | Passed |
| لم تتغير الأسئلة الأخرى بسبب Final QA | Passed |

## ملاحظات Importer

- `chapterId` يحتوي placeholder مقصود: `REPLACE_WITH_CHAPTER_ID`.
- يجب استبداله بمعرف الفصل الحقيقي قبل الاستيراد.
- لا يوجد `correctAnswer` داخل payload النهائي.
- لا يوجد `optionOrder` داخل payload النهائي؛ route الاستيراد يولده.

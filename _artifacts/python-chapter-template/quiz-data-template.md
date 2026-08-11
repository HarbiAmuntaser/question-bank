# Quiz Data Template

هذه قيم إعدادية لقالب الاختبار وليست أسعارًا أو قرارات تجارية نهائية.

| الحقل | القيمة | ملاحظة الإدخال |
| --- | --- | --- |
| title | `{{QUIZ_TITLE}}` | عنوان واضح يصف نطاق الاختبار. |
| description | `{{QUIZ_DESCRIPTION}}` | يوضح ما يقيسه الاختبار دون ادعاء الاعتماد الرسمي. |
| timeLimit | `{{TIME_LIMIT_MINUTES}}` | يحدد وفق عدد الأسئلة وصعوبتها. |
| difficulty | `{{DIFFICULTY_SELECTION}}` | اختر مستويات الصعوبة المطلوبة في مولد الاختبار. |
| shuffleQuestions | `{{SHUFFLE_QUESTIONS}}` | استخدم `true` أو `false` حسب قرار الاختبار. |
| accessType | `{{ACCESS_TYPE}}` | إحدى القيم: `inherit` أو `free` أو `paid`. |
| isFreePreview | `{{IS_FREE_PREVIEW}}` | استخدم `true` أو `false` حسب سياسة الوصول المعتمدة. |
| chapter selection | `{{CHAPTER_SELECTION}}` | اختر الفصل الحالي فقط ما لم يعتمد اختبار تراكمي. |
| question count | `{{QUESTION_COUNT}}` | لا يتجاوز عدد الأسئلة الصالحة والمتاحة. |

تأكد قبل الإنشاء من استيراد أسئلة الفصل ومراجعتها وتفعيل الأسئلة المعتمدة فقط.

# Python Chapter 1 Manual Entry Checklist

هذا الدليل يعتمد على المصادر الأربعة المعتمدة في `_artifacts/python-chapter-1-approved-sources`، وليس على النسخة الناتجة السابقة من ملفات pilot.

## 1. التحقق من Academy

لوحة الإدارة: `/admin/universities`

- تأكد من وجود `أكاديمية البرمجة` كسجل من نوع `academy`.
- إن كان حقل الظهور العام متاحًا، اجعل visibility = `global`.
- countryCode الأساسي يمكن أن يكون `SA` حسب القرار، لكنه لا يثبت داخل `contentHtml`.
- لا تستخدم كلمة جامعة في النصوص الظاهرة للمستخدم عند الحديث عن academy.

## 2. التحقق من Major

لوحة الإدارة: `/admin/majors`

| الحقل | القيمة |
| --- | --- |
| الاسم | `لغات البرمجة` |
| code/slug إن وجد | `programming-languages` |
| المؤسسة | أكاديمية البرمجة |
| degreeType إن ظهر | `other` |
| isActive | `true` |

## 3. إنشاء أو التحقق من Subject

لوحة الإدارة: `/admin/subjects`

| الحقل | القيمة |
| --- | --- |
| name | `Python` |
| code | `python` |
| majorId | يحدد بعد اختيار `لغات البرمجة` |
| description | وصف عام لمسار Python، ولا يكرر شرح الفصل نفسه |
| isActive | `true` |

## 4. إنشاء Chapter

لوحة الإدارة: `/admin/chapters`

| الحقل | القيمة |
| --- | --- |
| subjectId | معرف Subject `Python` |
| name | `المتغيرات وأنواع البيانات` |
| chapterNumber | `1` |
| description | `وحدة تأسيسية تعرّف المتعلم بالمتغيرات والإسناد وأنواع البيانات الأساسية وطرق التحويل البسيط بينها في Python.` |
| learningObjectives | `["فهم معنى المتغير", "استخدام الإسناد", "اختيار أسماء متغيرات صحيحة", "التمييز بين int وfloat وstr وbool وNone", "استخدام type()", "تنفيذ تحويلات أساسية بين الأنواع"]` |
| isActive | `true` |

لا تضف `noindex` أو `canonicalStatus` إلى Chapter. الفصل سجل تنظيمي ولا توجد له صفحة عامة مستقلة.

## 5. إنشاء StudySummary

لوحة الإدارة: `/admin/summaries`

| الحقل | القيمة |
| --- | --- |
| subjectId | معرف Subject `Python` |
| chapterId | معرف Chapter `المتغيرات وأنواع البيانات` |
| title | `ملخص المتغيرات وأنواع البيانات في Python` |
| slug | `python-variables-summary` |
| excerpt | شرح مبسط للمتغيرات وأنواع البيانات في Python |
| contentHtml | انسخ محتوى `python-chapter-1-study-summary.html` كاملًا |
| contentText | يمكن تركه فارغًا؛ API يولده من `contentHtml` |
| pdfAttachmentId | فارغ في هذه التجربة |
| status | `draft` أولًا، ثم `published` فقط بعد المعاينة والاختبار |
| language | `ar` |
| accessType | `inherit` مبدئيًا |
| readingMinutes | يحدد يدويًا إن رغبت، مثل `8` |
| sortOrder | `1` |
| isFeatured | `false` |

## 6. استيراد الأسئلة

لوحة الإدارة: `/admin/questions`

1. أنشئ الفصل واحصل على معرفه الحقيقي.
2. افتح `python-chapter-1-questions-import.json`.
3. استبدل `REPLACE_WITH_CHAPTER_ID` بمعرف الفصل الحقيقي.
4. استورد الملف من مستورد الأسئلة الموجود.
5. تأكد أن عدد الأسئلة المستوردة 20.

ملاحظة تقنية: payload يستخدم `options[].text` لأن هذا هو الحقل الذي يقبله `questionsImportSchema`. أما `optionOrder` فينشئه route الاستيراد تلقائيًا.

## 7. إنشاء Quiz من Quiz Generator

لوحة الإدارة: `/admin/quiz-generator`

| الحقل | القيمة |
| --- | --- |
| title | `اختبار أساسيات المتغيرات في Python` |
| slug عبر SeoMeta | `python-variables-quiz` |
| description | `اختبار تدريبي يقيس فهم المتغيرات والإسناد وقواعد التسمية وأنواع البيانات الأساسية والتحويل البسيط بينها في Python.` |
| totalQuestions | `20` |
| accessType | `inherit` مبدئيًا |

## 8. إضافة SeoMeta

لوحة الإدارة: `/admin/seo-meta`

- أضف SeoMeta للملخص باستخدام ownerType = `study_summary`.
- أضف SeoMeta للاختبار باستخدام ownerType = `exam`.
- بالنسبة للمادة Subject، استخدم خريطة SEO الخاصة بالمادة عند توفرها ولا تنشئ قيمة جديدة من هذه الحزمة.
- أبقِ `noindex = true` طوال التجربة.

## 9. اختبار روابط الطالب

- صفحة المادة:
  `/{cc}/academy/universities/{academySlug}/majors/{majorSlug}/subjects/python`
- صفحة الملخص:
  `/{cc}/academy/universities/{academySlug}/majors/{majorSlug}/subjects/python/summaries/python-variables-summary`
- صفحة الاختبار:
  `/{cc}/academy/universities/{academySlug}/majors/{majorSlug}/subjects/python/quizzes/python-variables-quiz`

## 10. قبل النشر

- راجع صفحة الطالب قبل تحويل الملخص من `draft` إلى `published`.
- تأكد أن رابط الاختبار النسبي يعمل من صفحة الملخص.
- تأكد أن الأسئلة تطابق المصادر المعتمدة.
- أبقِ `noindex=true` حتى اكتمال المسار والتدقيق.

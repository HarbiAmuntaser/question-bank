# Python Chapter 1 SeoMeta Values

هذه القيم مأخوذة من المصادر المعتمدة، خصوصًا الملف 03. لا تضف حقولًا غير موجودة في Schema الفعلية إلى payload قاعدة البيانات.

## Subject

المصادر الأربعة لا تقدم metaTitle/metaDescription نهائية لصفحة Subject. القرار المعتمد فقط:

| الحقل | القيمة |
| --- | --- |
| ownerType | `subject` |
| ownerId | يحدد بعد إنشاء Subject `Python` |
| slug | `python` |
| locale | `ar` |
| noindex | `true` |

لا تستخدم قيمة جديدة من إنشاء لاحق داخل هذه الحزمة. استخدم خريطة Subject المعتمدة عندما تتوفر.

## StudySummary

| الحقل | القيمة |
| --- | --- |
| ownerType | `study_summary` |
| ownerId | يحدد بعد إنشاء StudySummary |
| ownerIdHint | `python-variables-summary` |
| locale | `ar` |
| slug | `python-variables-summary` |
| Search intent | فهم المتغيرات وأنواع البيانات الأساسية في Python من خلال شرح تعليمي للمبتدئين |
| Primary Keyword | المتغيرات في بايثون |
| Secondary Keywords | أنواع البيانات في بايثون؛ شرح المتغيرات في Python؛ أسماء المتغيرات في Python؛ `type` في Python؛ تحويل أنواع البيانات في Python |
| metaTitle | المتغيرات وأنواع البيانات في Python للمبتدئين |
| metaDescription | شرح مبسط للمتغيرات وأنواع البيانات في Python، مع قواعد التسمية واستخدام type والتحويل بين int وfloat وstr وbool. |
| noindex | `true` |
| nofollow | `false` |
| canonicalStatus | `pending` كحالة تخطيطية فقط، وليس حقل DB مؤكدًا |
| canonicalUrl | `null` / غير محدد |
| schemaJson | `null` |

## Quiz

| الحقل | القيمة |
| --- | --- |
| ownerType | `exam` |
| ownerId | يحدد بعد إنشاء Quiz |
| ownerIdHint | `python-variables-quiz` |
| locale | `ar` |
| slug | `python-variables-quiz` |
| Search intent | تقييم فهم المتغيرات وأنواع البيانات في Python |
| Primary Keyword | اختبار المتغيرات في بايثون |
| Secondary Keywords | أسئلة المتغيرات في بايثون؛ اختبار أنواع البيانات في Python؛ أسئلة أنواع البيانات في بايثون |
| metaTitle | اختبار المتغيرات وأنواع البيانات في Python |
| metaDescription | اختبار تدريبي من 20 سؤالًا لمراجعة المتغيرات وأنواع البيانات وقواعد التسمية واستخدام type والتحويل بين الأنواع في Python. |
| noindex | `true` |
| nofollow | `false` |
| canonicalStatus | `pending` كحالة تخطيطية فقط، وليس حقل DB مؤكدًا |
| canonicalUrl | `null` / غير محدد |
| StudySummary review link | يربط لاحقًا بـ`python-variables-summary` |
| schemaJson | `null` |

## حدود مهمة

- لا تضف `| مستواك` إلى `metaTitle`.
- لا تضف canonical نهائي الآن.
- لا تضع `canonicalStatus` في DB إذا لم يكن حقلًا فعليًا.
- لا تضف keywords إلى SeoMeta إذا لم تكن موجودة في Schema.
- أبقِ `noindex=true` أثناء التجربة.

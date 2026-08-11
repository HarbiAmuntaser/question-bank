# Python Chapter Production Template

هذا المجلد هو قالب الإنتاج القياسي للفصول القادمة في مسار Python. بُني اعتمادًا على البنية التقنية التي أثبت نجاحها في Pilot Chapter 1، من دون نسخ محتوى الفصل الأول أو بدء محتوى Chapter 2.

يظل المجلد `_artifacts/python-chapter-1-pilot` هو **Reference Implementation** للتحقق من شكل الملفات وآلية الإدخال التي جُرّبت بنجاح. أما هذا المجلد فهو Skeleton قابل لإعادة الاستخدام بعد استبدال placeholders بمحتوى كل فصل واعتماده.

## الملفات

- `study-summary-template.html`: هيكل `contentHtml` للملخص.
- `questions-admin-import-template.json`: نموذج Array متوافق مع مستورد `/admin/questions`.
- `chapter-data-template.md`: بيانات إنشاء الفصل.
- `study-summary-data-template.md`: بيانات إنشاء الملخص كمسودة.
- `quiz-data-template.md`: إعدادات إنشاء الاختبار.
- `seo-meta-template.md`: بيانات SeoMeta للملخص والاختبار.
- `chapter-production-checklist.md`: ترتيب الإنتاج من الفصل حتى النشر.
- `chapter-validation-checklist.md`: فحوص HTML وJSON والروابط وSEO.
- `PYTHON_CHAPTER_CONTENT_RENDERING_CONTRACT.md`: عقد تنسيق ثابت لـPY-02 يحدد شكل الكود داخل الأسئلة والملخصات.

## طريقة الاستخدام

1. انسخ مجلد القالب إلى مجلد عمل جديد خاص بالفصل المطلوب.
2. استبدل placeholders دون تغيير أسماء الحقول أو شكل JSON المعتمد.
3. أنشئ قاموس Tags ونطاق محتوى خاصين بالفصل قبل كتابة الأسئلة.
4. طبّق `PYTHON_CHAPTER_CONTENT_RENDERING_CONTRACT.md` على الأسئلة و`contentHtml`.
5. اتبع `chapter-production-checklist.md` بالترتيب.
6. نفّذ `chapter-validation-checklist.md` قبل أي نشر أو إزالة لـ`noindex`.

## تنسيق محتوى Python

- نصوص الأسئلة تستخدم inline backticks للدوال والمعرّفات والقيم والعوامل البرمجية المضمنة.
- كود Python المستقل أو متعدد الأسطر داخل `questionText` يستخدم fenced code مع المعرّف `python`.
- `contentHtml` لا يعالج Markdown؛ لذلك يستخدم `<code>...</code>` للمصطلحات المضمنة و`<pre dir="ltr"><code>...</code></pre>` لكتل الكود.
- يجب فحص العرض الفعلي من واجهة الطالب ومقارنته بـChapter 1 قبل اعتماد الفصل.

## متطلبات SEO لكل صفحة

كل `StudySummary` وكل `Quiz` يحتاج إلى:

- `Meta Title` بلا تكرار لاسم الموقع.
- `Meta Description` يصف محتوى الصفحة بدقة.
- `OG Title` مناسب للمشاركة الاجتماعية.
- `OG Description` موجز ومناسب للمشاركة الاجتماعية.
- `Canonical URL` بعد اعتماد الرابط النهائي فقط، ويبقى فارغًا أو `null` أثناء الإنتاج.
- `noindex=true` طوال مرحلة الإنتاج والتجربة، ولا يُزال تلقائيًا بمجرد النشر.

هذه الملفات مخصصة للمساعدة في الإدخال اليدوي والمراجعة. لا تفترض وجود اتصال مباشر بقاعدة البيانات أو استدعاء تلقائي لأي API.

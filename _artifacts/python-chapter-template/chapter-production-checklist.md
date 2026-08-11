# Chapter Production Checklist

نفّذ المراحل بالترتيب، ولا تنتقل إلى النشر قبل اكتمال التحقق.

- [ ] **Chapter:** إنشاء الفصل وربطه بمادة Python الصحيحة، ثم مراجعة الاسم والرقم والأهداف.
- [ ] **StudySummary draft:** إنشاء الملخص بحالة `draft` وربطه بالفصل، ثم تطبيق قواعد HTML وRTL/LTR المحددة في `PYTHON_CHAPTER_CONTENT_RENDERING_CONTRACT.md`.
- [ ] **Questions Admin Import:** تجهيز JSON Array، والتحقق من fenced code وinline code وفق عقد التنسيق، ثم استيراده من `/admin/questions` بعد اختيار المسار والفصل.
- [ ] **Quiz:** إنشاء الاختبار من الأسئلة المعتمدة وربطه بالفصل والمادة.
- [ ] **SeoMeta StudySummary:** إضافة SEO للملخص مع `noindex=true` أثناء التجربة.
- [ ] **SeoMeta Quiz:** إضافة SEO للاختبار مع `noindex=true` أثناء التجربة.
- [ ] **Student Preview:** معاينة صفحة المادة والملخص والاختبار من واجهة الطالب، ومقارنة عرض النص والكود بصريًا مع Chapter 1 Reference Implementation.
- [ ] **Validation:** تنفيذ `chapter-validation-checklist.md`، بما في ذلك Visual Rendering Validation، وتسجيل أي ملاحظات.
- [ ] **Publish when approved:** إزالة placeholders، ثم اعتماد المحتوى، ثم اعتماد Canonical URL، ثم اتخاذ قرار إزالة `noindex` والسماح بالفهرسة عند جاهزية الصفحة. لا تُزل `noindex` تلقائيًا بمجرد النشر.

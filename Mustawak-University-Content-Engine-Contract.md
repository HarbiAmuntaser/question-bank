# Mustawak University Content Engine Contract

> هذا المستند نتيجة تدقيق ساكن للكود الفعلي، وليس تصميمًا مقترحًا ولا مواصفة لميزة مستقبلية.
> **Fact** تعني أن السلوك مثبت في الكود أو Prisma أو Validation أو Migration.
> **Inference** تعني استنتاجًا محدودًا مبنيًا على أكثر من دليل، ويشار إليه صراحة.
> ملفات PDF وWord والعروض الأصلية للمقرر مفترضة كمصادر إنتاج خارج المنصة فقط وفق القرار الوظيفي المقدم، ولا يثبت هذا المستند وجود تدفق حالي لاستيرادها.

## 1. Contract Status

| البند | الحالة |
|---|---|
| تاريخ الفحص | 2026-08-17 |
| الفرع | `main` |
| Commit | `f9b7327f439ad8eb61d08e3fe8fc21ab688cca6e` |
| نطاق الفحص | Prisma والمهاجرات، Validations، Admin UI وActions وAPIs، Student APIs وصفحات العرض، Import، Renderer، SEO، Sitemap، Cache، Seed، والوثائق ذات الصلة |
| مستوى الثقة | مرتفع في العقود الساكنة وتدفق الكود؛ لم تُفحص بيانات الإنتاج الفعلية ولم تُنفذ عمليات كتابة على قاعدة البيانات |
| حالة المستودع عند الفحص | كان يوجد تعديل سابق للمستخدم في `src/components/public/study-summaries/copyable-summary-content.tsx` ولم يُعدّل أو يُتراجع عنه ضمن هذه المهمة |

لم يوجد `AGENTS.md`. ملف `README.md` في الجذر لا يقدم عقدًا معماريًا يمكن الاعتماد عليه، ولذلك عومل الكود و`prisma/schema.prisma` وملفات Validation بوصفها مصدر الحقيقة. لم يُعثر على اختبارات تعاقدية آلية أو Fixtures تعليمية تغطي هذا المسار.

**الخلاصة:** النتائج الأساسية مثبتة، لكن توجد فجوات غير محسومة في تجربة Chapter العامة، سياسة ربط Quiz بالفصل، Sanitization، وبعض مستويات SEO. هذه الفجوات موثقة في القسمين 15 و16 ولا يتم ملؤها بالتخمين.

## 2. System Architecture Relevant to University Content

| الجانب | العقد الفعلي | الدليل |
|---|---|---|
| Framework | Next.js 15 App Router مع React 19 وTypeScript | `package.json`, `src/app/` |
| قاعدة البيانات | PostgreSQL عبر Prisma 6 | `package.json`, `prisma/schema.prisma` |
| Routing العام | مسار هرمي Catch-all للتعليم، ومسار مستقل مبني على ID لتشغيل Quiz | `src/app/[cc]/[type]/universities/[...slug]/page.tsx`, `src/app/quiz/[id]/page.tsx` |
| Validation | Zod لكل كيان تقريبًا، مع عقود منفصلة للأسئلة اليدوية والاستيراد | `src/validations/` |
| إدارة المحتوى | صفحات Admin تستدعي Server Actions، وتستدعي Actions بدورها Admin APIs | `src/app/admin/`, `src/app/api/v1/admin/` |
| الصلاحيات | Admin APIs محمية بواسطة `verifyAdmin`؛ الوصول المدفوع للطالب يتحقق في Server helpers/endpoints | `src/lib/admin-auth.ts`, `src/lib/server/access-control.ts` |
| الكاش | `unstable_cache` وcache tags مع invalidation مركزي؛ بيانات الطالب الخاصة وAdmin تستخدم `private, no-store` | `src/lib/cache-tags.ts`, `src/lib/cache-invalidation.ts`, `docs/cache-vercel-checklist.md` |
| اللغات | السجل يدعم `ar` و`en` في `ContentLanguage` و`Locale`، لكن Routes التعليمية لا تحتوي segment لغة، ومعظم الاستعلامات العامة تستخدم `locale: "ar"` أو `language: "ar"` | `prisma/schema.prisma`, `src/lib/server/study-summaries.ts`, Student SEO APIs |
| التخزين | المرفقات Polymorphic وتدعم `local`, `external_url`, `r2` و`public/private` | `prisma/schema.prisma`, `src/lib/server/storage/` |
| عرض الملخص | HTML موثوق من Admin يعرض عبر `dangerouslySetInnerHTML` بعد تنظيف دفاعي محدود، أو نص عادي كـ fallback | `src/lib/server/study-summaries.ts`, `src/components/public/study-summaries/study-summary-details.tsx` |
| عرض السؤال | Parser خفيف مخصص، وليس Markdown renderer كاملًا؛ يدعم fenced code وinline code وصيغًا نصية شبيهة بالرياضيات | `src/components/shared/rich-question-content.tsx` |

الدول والأنواع تمر عبر `/{cc}/{type}`، والأنواع الفعلية هي `university`, `school`, `academy`. المحرك التعليمي الأساسي مشترك بينها؛ اسم Model `University` لا يعني أن السجل جامعة بالضرورة.

## 3. Actual Educational Hierarchy

البنية المثبتة هي:

```text
University (institutionType = university | school | academy)
  -> Major
    -> Subject
      -> Chapter
        -> Question

Subject
  -> StudySummary (chapterId اختياري)
  -> Quiz (subjectId اختياري)

Quiz
  -> QuizQuestion
    -> Question
      -> Chapter
```

### University

- **Fact:** Model الفعلي هو `University` ويخزن `name`, `code?`, `city?`, `region?`, `logoUrl?`, `countryCode`, `institutionType`, `visibility`, `isActive` وحقول التدقيق.
- المطلوب في Prisma: `name`, `countryCode`, `institutionType`, `visibility` مع defaults؛ الحقول الجغرافية اختيارية.
- `code` فريد عالميًا عند وجوده: `@unique`.
- الهوية الأساسية هي `id` من نوع UUID. Slug ليس حقلًا في `University`؛ يأتي من `SeoMeta.slug`، مع fallback إلى `code` أو `id` في بعض مسارات العرض/Sitemap.
- `isActive` هو حالة التفعيل الوحيدة، ولا يوجد status نشر مستقل.
- علاقة `University -> Major` تعلن Cascade، وتتتابع علاقات Cascade حتى Chapter/Question. لكن قيودًا تابعة مثل `QuizQuestion` و`UserAnswer` قد تمنع حذف السلسلة فعليًا؛ لذلك هذا وصف لعقد العلاقات لا ضمان لنجاح كل عملية حذف إدارية.
- الدليل: `prisma/schema.prisma`, `src/validations/university.ts`, `src/app/api/v1/admin/universities/route.ts`.

### Major

- الحقول المهمة: `universityId`, `name`, `code?`, `degreeType?`, `durationYears?`, `isActive` وحقول التدقيق.
- `degreeType` ما زال `String?` وليس enum. طبقة الإدارة تطبعه إلى `bachelor`, `diploma`, `other` بواسطة `normalizeDegreeType`.
- القيد الفريد: `@@unique([universityId, code])`.
- لا يوجد slug داخل Model؛ يستخدم `SeoMeta.slug` أو fallback.
- العلاقة مع `University` هي Cascade عند حذف المؤسسة.
- الدليل: `prisma/schema.prisma`, `src/validations/major.ts`, `src/lib/degree-types.ts`, `src/components/admin/majors/major-dialog.tsx`.

### Subject

- الحقول المهمة: `majorId`, `name`, `code?`, `creditHours?`, `semester?`, `year?`, `description?`, `isActive` وحقول التدقيق.
- القيد الفريد: `@@unique([majorId, code])`.
- لا يوجد slug داخل Model؛ يستخدم `SeoMeta.slug` أو `code/id` fallback.
- يرتبط بـ`Chapter[]`, `Quiz[]`, `StudySummary[]` وخطط الوصول.
- حذف `Major` يحذف `Subject` عبر Cascade.
- الدليل: `prisma/schema.prisma`, `src/validations/subject.ts`, `src/components/admin/subjects/subject-dialog.tsx`.

### Chapter

- الحقول المهمة: `subjectId`, `name`, `chapterNumber?`, `description?`, `learningObjectives String[]`, `isActive` وحقول التدقيق.
- القيد الفريد: `@@unique([subjectId, chapterNumber])`.
- لا يوجد `slug` في Model، ولا status نشر مستقل، ولا ترتيب مستقل غير `chapterNumber` الاختياري.
- يرتبط مباشرة بـ`Question[]` و`StudySummary[]`، ولا يرتبط مباشرة بـ`Quiz`.
- علاقة `Subject -> Chapter` وعلاقة `Chapter -> Question` تعلنان Cascade. قد تفشل عملية الحذف عند وجود علاقات مقيدة على Question، وهو ما يتعامل معه Admin API برسالة فشل عامة. أما `StudySummary.chapterId` فيصبح `null` بسبب `onDelete: SetNull`.
- الدليل: `prisma/schema.prisma`, `src/validations/chapter.ts`, `src/app/api/v1/admin/chapters/`.

## 4. Chapter Contract

### العقد المثبت

| الخاصية | السلوك الفعلي |
|---|---|
| الانتماء | `subjectId` مطلوب، وعلاقة Chapter بمادة واحدة مباشرة |
| الاسم | `name` مطلوب |
| الرقم | `chapterNumber` اختياري، عدد صحيح موجب في Validation |
| الترتيب | لا يوجد `sortOrder`; الترتيب المتوقع عند الاستخدام هو `chapterNumber` |
| الوصف | `description` اختياري |
| الأهداف | `learningObjectives` مصفوفة نصوص، default في Validation هو `[]` |
| الحالة | `isActive` فقط |
| Slug | غير موجود في Chapter نفسه |
| SEO | يمكن إنشاء `SeoMeta(ownerType = chapter)` إداريًا، لكن لا توجد صفحة Chapter عامة تستهلكه |
| الملخص | `StudySummary.chapterId` اختياري؛ يمكن صفر أو أكثر من الملخصات للفصل |
| الأسئلة | كل Question تتطلب `chapterId` واحدًا |
| الاختبار | لا توجد علاقة Chapter -> Quiz؛ العلاقة غير المباشرة عبر Questions داخل Quiz |

### إنشاء وتعديل Chapter

- النموذج اليدوي في `/admin/chapters` يختار المؤسسة ثم Major ثم Subject، ويحرر الاسم والرقم والوصف والأهداف والتفعيل.
- Server Actions في `src/app/admin/chapters/actions.ts` تستدعي Admin API.
- CRUD موجود في `src/app/api/v1/admin/chapters/route.ts` و`src/app/api/v1/admin/chapters/[id]/route.ts`.
- Validation في `src/validations/chapter.ts`.
- لا يوجد JSON import خاص بالفصول، ولا script إنتاج فصول عام مثبت.

**Inference محدودة:** يمكن لنظام إنتاج خارجي إنشاء Chapter ثم Summary وأسئلة ثم Quiz من خلال APIs الحالية واحدًا بعد آخر، لكن لا توجد حزمة Import ذرية أو Contract رسمي يربط هذه العمليات معًا.

## 5. StudySummary Contract

### طبيعة الكيان

`StudySummary` كيان مستقل تابع مباشرة لـ`Subject`. ارتباطه بـ`Chapter` اختياري، ولذلك ليس جزءًا إجباريًا من Chapter ولا يفرض النظام ملخصًا واحدًا لكل فصل.

### الحقول الفعلية

| الحقل | مطلوب في Prisma | ملاحظات العقد |
|---|---:|---|
| `subjectId` | نعم | المالك التعليمي الأساسي |
| `chapterId` | لا | يجب أن ينتمي إلى Subject نفسه؛ يحول إلى `null` عند حذف Chapter |
| `title` | نعم | 2 إلى 180 في Validation |
| `slug` | نعم | Unicode letters/numbers/hyphens، وفريد مع `subjectId + language` |
| `excerpt` | لا | حتى 700 |
| `content` | لا | `Json?`; لا يثبت العرض العام الحالي استخدامه |
| `contentText` | لا | حتى 50,000 في Validation، fallback عرض نصي |
| `contentHtml` | لا | `Text`, حتى 200,000 في Validation، وهو مسار العرض الغني الفعلي |
| `pdfAttachmentId` | لا | مرجع Attachment؛ يكفي مع غياب HTML/Text لإنشاء الملخص |
| `status` | نعم | `draft`, `published`, `archived`; default `draft` |
| `accessType` | نعم | `inherit`, `free`, `paid`; default `inherit` |
| `publishedAt` | لا | شرط لازم للعرض العام، ويجب ألا يكون في المستقبل |
| `language` | نعم | `ar` أو `en`; العرض الحالي يستعلم `ar` |
| `readingMinutes` | لا | عدد موجب |
| `sortOrder` | نعم | default `0` |
| `isFeatured` | نعم | default `false` |

عند الإنشاء يجب وجود واحد على الأقل من `contentHtml`, `contentText`, `pdfAttachmentId`. وعند التعديل، API يدمج القيم الجديدة مع القديمة ثم يمنع النتيجة الفارغة. عند تحويل سجل لم يسبق نشره إلى `published` بدون تاريخ، يضع API الوقت الحالي؛ تعديل سجل منشور لا يعيد ضبط `publishedAt` تلقائيًا. الأدلة: `src/validations/study-summary.ts`, `src/app/api/v1/admin/summaries/route.ts`, `src/app/api/v1/admin/summaries/[id]/route.ts`.

### شرط الظهور العام

كل الشروط التالية مطلوبة:

```text
status = published
publishedAt != null
publishedAt <= now
language = ar
subjectId يطابق المادة الحالية
```

الدليل: `src/lib/server/study-summaries.ts`.

### Renderer وHTML

- `contentHtml` يعرض داخل `.summary-content` باستخدام `dangerouslySetInnerHTML`.
- `prepareTrustedSummaryHtml` يزيل بأنماط Regex عناصر خطرة شائعة مثل `script`, `style`, `iframe`, `object`, `embed`, `form`, `link`, `meta`، وخصائص `on*` و`javascript:`.
- **Fact:** هذه ليست allowlist Sanitizer كاملة. تعليق الكود نفسه يقصرها على HTML موثوق من Admin ويطلب Sanitizer مخصصًا قبل توسيع المحررين.
- العناصر المنسقة مركزيًا: `h2`, `h3`, `h4`, `p`, `a`, `ul`, `ol`, `li`, `blockquote`, `table`, `caption`, `th`, `td`, `figure`, `img`, `figcaption`, `code`, `pre`, `hr`.
- الجداول تستخدم scroll أفقيًا داخل الجدول، والأكواد `direction: ltr`، بينما الحاوية الأساسية RTL.
- كل `pre` يمكن أن يلفه مكوّن العميل الحالي بشريط وزر نسخ دون تغيير HTML المخزن.
- لا توجد مكتبة syntax highlighting مثبتة لهذا Renderer؛ `class="language-python"` لا ينتج تلوينًا لغويًا بذاته.
- الأدلة: `src/lib/server/study-summaries.ts`, `src/components/public/study-summaries/copyable-summary-content.tsx`, `src/app/globals.css`.

### الإدارة والاستيراد وSEO

- الإنشاء والتعديل يدويان من `/admin/summaries` عبر `summary-dialog.tsx` وAdmin APIs.
- لا يوجد JSON import عام للملخصات.
- للملخص SEO مستقل عبر `SeoMeta(ownerType = study_summary, ownerId = summary.id)`.
- Routing يعتمد على `StudySummary.slug`، وليس `SeoMeta.slug`.
- المسار العام:
  `/{cc}/{type}/universities/{universitySlug}/majors/{majorSlug}/subjects/{subjectSlug}/summaries/{summarySlug}`.

## 6. Public Chapter Page

**Fact حاسم:** لا توجد صفحة عامة مستقلة لـChapter حاليًا، ولا يتعرف route parser على segment باسم `chapters`.

المسار الهرمي العام يتعرف فقط على:

```text
University
Major
Subject
Quiz
StudySummary
```

الدليل: `parseUniversitiesCatchAll` في `src/app/[cc]/[type]/universities/[...slug]/page.tsx`.

### ما يراه الطالب بدلًا من صفحة Chapter

1. صفحة Subject تجلب بيانات المادة.
2. تجلب Quizzes النشطة للمادة.
3. تجلب StudySummaries المنشورة للمادة.
4. العرض الافتراضي هو الاختبارات، ويظهر switch للملخصات فقط إن وجدت ملخصات.
5. بطاقة الملخص قد تعرض معلومات Chapter و`hasPdf`، لكنها تنتقل إلى صفحة Summary لا إلى صفحة Chapter.
6. صفحة Summary تعرض العنوان والوصف وبيانات Chapter إن وجدت والمحتوى أو بوابة الوصول وزر PDF الآمن عند السماح.

الأدلة: `src/components/public/subject-details.tsx`, `src/components/public/subject-learning-switcher.tsx`, `src/components/public/study-summaries/subject-study-summaries.tsx`, `src/components/public/study-summaries/study-summary-details.tsx`.

### أثر ذلك على الرؤية الوظيفية

الرؤية: "داخل Chapter يظهر ملخص موحد مختصر واختبار الفصل" **غير مطبقة حرفيًا**. المتاح حاليًا هو Subject page تجمع كل Quizzes وكل Summaries، مع Chapter metadata غير إلزامية. لا يوجد Container عام يضمن ملخصًا واحدًا واختبارًا واحدًا لكل Chapter، ولا Breadcrumb أو Metadata أو Empty State خاص بصفحة Chapter.

## 7. Questions Contract

### Model والتخزين

`Question` تتطلب `chapterId` ولا تحتوي `subjectId` مباشرًا. المادة تستنتج عبر `Question -> Chapter -> Subject`.

| الحقل | العقد |
|---|---|
| `questionText` | نص مطلوب؛ يدعم Renderer العام markup خفيفًا فقط |
| `questionType` | Prisma: `multiple_choice`, `true_false`, `short_answer`, `essay` |
| `difficultyLevel` | `easy`, `medium`, `hard`; default `medium` |
| `points` | default `1`; Validation اليدوي 1 إلى 10 |
| `explanation` | اختياري، حتى 2000 في Validation اليدوي |
| `imageUrl` | URL اختياري |
| `tags` | `String[]`؛ لا يوجد قاموس Tags في Schema |
| `isActive` | default `true`؛ لا يوجد draft/published |
| `language` | `ar` أو `en`; default `ar` |
| الترتيب | لا ترتيب داخل Question؛ الترتيب داخل Quiz محفوظ في `QuizQuestion.questionOrder` |

`QuestionOption` تخزن `optionText`, `isCorrect`, `optionOrder?`. لا يوجد حقل DB باسم `correctAnswer` أو `tfAnswer`. في الاستيراد فقط، `tfAnswer: boolean` يتحول إلى خيارين نصهما `True` و`False` مع تحديد `isCorrect`.

### الدعم الفعلي حسب المسار

| المسار | الأنواع المدعومة فعليًا |
|---|---|
| Prisma وValidation العام | الأنواع الأربعة |
| Admin dialog اليدوي | `multiple_choice`, `true_false` فقط |
| JSON/JSONL import | `multiple_choice`, `true_false` فقط |
| Quiz runtime | يعرف الأنواع الأربعة |
| Grading | MCQ وTF لهما تصحيح فعلي؛ `short_answer` و`essay` يعدان صحيحين بمجرد وجود نص غير فارغ |

هذا تعارض يجب ألا يخفيه نظام إنتاج المحتوى.

### Validation والقيود

- MCQ اليدوي وAPI import يطلبان خيارين على الأقل وإجابة صحيحة واحدة **على الأقل**، وليس بالضرورة واحدة بالضبط.
- Parser واجهة الاستيراد يطبق تحققًا أشد ويطلب إجابة صحيحة واحدة عند المعاينة.
- True/False اليدوي يطلب خيارين `true/false` بالضبط وإجابة صحيحة واحدة.
- لا توجد قيود DB تمنع تعدد الخيارات الصحيحة في MCQ.
- الحذف قد يُمنع عند وجود `UserAnswer`؛ API الحذف يدير روابط Quiz/options ويعيد حساب المجاميع بدل الاعتماد على Cascade أعمى.

### تنسيق `questionText` و`explanation`

`RichQuestionContent` ليس Markdown كاملًا. يدعم:

````text
```python
print("example")
```

`inline_code`
$lightweight_notation$
````

الكود المحاط بثلاث backticks يظهر في كتلة LTR داكنة، والـinline code يظهر LTR. بقية Markdown مثل headings والجداول والقوائم غير مثبتة في هذا Renderer. الدليل: `src/components/shared/rich-question-content.tsx` واستخدامه في Runtime وReview.

### ملاحظة أمنية مثبتة

`GET /api/v1/student/quizzes/by-id/[id]` يعيد `explanation` و`options.isCorrect` إلى المتصفح قبل التسليم، بعد تحقق الوصول. هذا يجعل النتيجة والمراجعة المحلية ممكنتين، لكنه يعني أن الإجابات قابلة للاطلاع من DevTools أثناء الاختبار. التصحيح النهائي يعيد التحقق من DB، لكن التسريب إلى العميل قائم. الدليل: `src/app/api/v1/student/quizzes/by-id/[id]/route.ts`.

## 8. Quiz Contract

### Model

| الحقل | العقد الفعلي |
|---|---|
| `title` | مطلوب |
| `description` | اختياري |
| `timeLimit` | دقائق، default 30؛ التوليد يقبل 1 إلى 180 |
| `totalQuestions` | مطلوب ومخزن |
| `totalPoints` | مخزن، default 0 |
| `isActive` | حالة العرض، default true |
| `subjectId` | اختياري |
| `accessType` | `inherit`, `free`, `paid` |
| `isFreePreview` | Boolean مستقل |

لا يخزن Quiz `chapterId`, `difficulty`, `shuffleQuestions` أو قائمة selected chapters. `difficulty`, `randomize`, `questionTypes`, `selectedChapters`, `questionCount` هي إعدادات توليد مؤقتة فقط.

### العلاقة بالفصول والأسئلة

- Quiz يرتبط بالأسئلة من خلال `QuizQuestion`.
- `QuizQuestion` يفرض فريدة `(quizId, questionId)` وفريدة `(quizId, questionOrder)`.
- يمكن أن يجمع Quiz أسئلة من عدة Chapters، وحتى من عدة Subjects حسب API؛ في هذه الحالة يصبح `Quiz.subjectId = null`.
- إذا كانت كل Chapters المختارة تابعة لمادة واحدة، يخزن API تلك المادة في `subjectId`.
- لا يوجد قيد "Quiz واحد لكل Chapter". يمكن أن تدخل أسئلة الفصل نفسه في عدة Quizzes.
- Preview وSitemap يستطيعان استنتاج Subject من أول Question عندما يكون `subjectId` فارغًا، وهو fallback وليس علاقة صريحة كاملة.

### التوليد والإدارة

- `/admin/quiz-generator` يختار Chapters، العنوان، الوقت، الصعوبة، العشوائية، وسياسة الوصول.
- الواجهة الحالية ترسل `questionTypes: []` وتستخدم جميع الأنواع المتاحة، وترسل عددًا كبيرًا للحصول على كل الأسئلة المتاحة.
- POST `/api/v1/admin/quizzes` يرشح Questions النشطة حسب Chapters والصعوبة والأنواع، يخلطها عند الطلب، ثم ينشئ Quiz وQuizQuestion.
- حقل `description` لا يرسل في توليد Quiz الحالي، ويمكن تحريره لاحقًا من صفحة التفاصيل.
- لا يوجد Import JSON مستقل لإنشاء Quiz مع قائمة IDs محددة.

### العرض والتشغيل والنتيجة

- صفحة Preview الهرمية:
  `/{cc}/{type}/universities/.../subjects/{subjectSlug}/quizzes/{quizSlug}`.
- صفحة التشغيل الفعلية: `/quiz/{id}`.
- النتائج والمراجعة: `/quiz/{id}/results?session=...` و`/quiz/{id}/review?session=...`.
- Runtime وGrade تتحققان من access وتستخدمان anonymous session، وتعيدان `private, no-store`.
- `QuizAttempt` و`UserAnswer` يخزنان المحاولة والإجابات.
- التوجيهات بعد النتيجة Deterministic وليست AI: تجمع الأخطاء حسب Chapter وTags وDifficulty، وتقترح StudySummaries المنشورة المرتبطة بالفصل عند وجودها. لا تحدد section داخل HTML ولا صفحة داخل PDF.
- الأدلة: `src/app/api/v1/admin/quizzes/route.ts`, `src/app/api/v1/student/quizzes/grade/route.ts`, `src/components/public/quiz/result/result-study-guidance.tsx`.

## 9. Import and Admin Contract

| الكيان | Manual Admin | Import فعلي | API/Action | Seed |
|---|---|---|---|---|
| University | نعم، `/admin/universities` | لا | CRUD Admin API + Actions | توجد عينات جامعات قديمة |
| Major | نعم، `/admin/majors` | لا | CRUD Admin API + Actions | توجد عينات |
| Subject | نعم، `/admin/subjects` | لا | CRUD Admin API + Actions | توجد عينات |
| Chapter | نعم، `/admin/chapters` | لا | CRUD Admin API + Actions | توجد عينات |
| StudySummary | نعم، `/admin/summaries` | لا | CRUD Admin API + Actions | لا توجد عينات في `prisma/seed.ts` |
| Question | نعم، `/admin/questions` | JSON/JSONL لأسئلة MCQ/TF | CRUD + `/api/v1/admin/questions/import` | توجد 3 أسئلة وخيارات قديمة |
| Quiz | نعم عبر Generator ثم Edit | لا يوجد Import JSON | `/api/v1/admin/quizzes`, preview و`[id]` | لا توجد Quizzes في `prisma/seed.ts` |
| SeoMeta | نعم، `/admin/seo-meta` | لا | CRUD + owner picker | لا توجد عينات في seed |

### عقد استيراد الأسئلة

واجهة `/admin/questions` تقبل:

- JSON Array مباشر.
- JSONL.
- كائنًا يحتوي `questions` أو `items` أو `data`.
- Code fence من نوع JSON.

لكن Endpoint الفعلي يستقبل Envelope:

```json
{
  "chapterId": "chapter-id",
  "items": [
    {
      "questionText": "...",
      "questionType": "multiple_choice",
      "difficultyLevel": "medium",
      "points": 1,
      "explanation": "...",
      "tags": ["..."],
      "isActive": true,
      "options": [
        { "text": "...", "isCorrect": true },
        { "text": "...", "isCorrect": false }
      ]
    }
  ],
  "duplicateStrategy": "skip"
}
```

- `duplicateStrategy`: `allow`, `skip`, `fail`، والـschema default هو `allow` بينما UI default هو `skip`.
- الواجهة تقسم الاستيراد إلى دفعات من 100.
- كل دفعة تنفذ داخل Prisma transaction واحدة.
- كشف التكرار يطبع whitespace ويقارن النص lowercase داخل Chapter نفسه.
- الاستيراد لا يقبل `chapterId` داخل كل item؛ الواجهة تختار Chapter منفصلًا وتضيفه للـEnvelope.
- الأدلة: `src/validations/question-import.ts`, `src/components/admin/questions/import-questions-dialog/`, `src/app/api/v1/admin/questions/import/route.ts`.

### Seed

`prisma/seed.ts` ينشئ Admin وUniversity/Major/Subject/Chapter و3 Questions وخياراتها. لا ينشئ StudySummary أو Quiz أو SeoMeta أو Attachment. بياناته قديمة وبعض النصوص تظهر mojibake في الملف، ولذلك لا يصلح وحده مرجعًا لمحتوى إنتاج حديث أو Renderer contract.

## 10. SEO Contract by Entity Level

كل SEO يخزن مركزيًا في `SeoMeta`:

```text
ownerType, ownerId, locale, slug,
metaTitle, metaDescription,
ogTitle, ogDescription, ogImageUrl,
canonicalUrl, noindex, nofollow, schemaJson
```

القيد الفريد هو `(ownerType, ownerId, locale)`. `locale` يدعم `ar/en`. Slug العربية والإنجليزية مسموحة عمومًا، لكن `locale=en` يفرض ASCII في Validation.

| المستوى | Owner type | Slug المستخدم في Routing | Metadata العامة | Canonical | Sitemap |
|---|---|---|---|---|---|
| University | `university` | `SeoMeta.slug` مع fallback `code/id` | يستخدم meta/OG/robots | محسوب هرميًا؛ `canonicalUrl` المخزن غير مستخدم هنا | في وضع `full` فقط، ويحترم `noindex` عبر route slug helper |
| Major | `major` | `SeoMeta.slug` مع fallback | **لا يطبق override الكامل حاليًا**؛ fallback من الاسم فقط | محسوب هرميًا | في `full` فقط |
| Subject | `subject` | `SeoMeta.slug` مع fallback | يستخدم meta/OG/robots | محسوب هرميًا | في `full` فقط |
| Chapter | `chapter` | لا يوجد Public route | لا توجد `generateMetadata` لصفحة Chapter | غير موجود | لا يدخل Sitemap |
| StudySummary | `study_summary` | `StudySummary.slug` فقط | SeoMeta override + fallback من الملخص والمادة | محسوب هرميًا | منشور ومستحق وغير `noindex` وفي `full` فقط |
| Quiz | `exam` | `SeoMeta.slug` مع fallback ID | يستخدم meta/OG/robots | محسوب هرميًا | نشط وبسلسلة فعالة وفي `full` فقط |

### ملاحظات دقيقة

1. `SeoMeta.slug` يؤدي دور Routing لجامعة/Major/Subject/Quiz، لكنه Override فقط للملخص؛ مصدر routing للملخص هو `StudySummary.slug`.
2. صفحة Major العامة تجلب Major مع slug، لكنها لا تستدعي Student Major SEO endpoint داخل `generateMetadata`; لذلك `metaTitle`, `metaDescription`, OG و`noindex/nofollow` الخاصة بـMajor لا تستهلك هناك.
3. `canonicalUrl` مخزن وقابل للتحرير، لكن catch-all التعليمي يبني canonical رسميًا من `SITE_URL` والسلسلة الهرمية ولا يستخدم override المخزن.
4. `schemaJson` مخزن وتعيده بعض SEO APIs، لكن لا يوجد rendering له في صفحة التفاصيل التعليمية. Rendering مثبت في صفحات المدونة فقط.
5. title العام يستخدم template الموقع في `src/app/layout.tsx`، وصفحات التفاصيل تنظف اسم الموقع بواسطة `stripSiteNameFromTitle` لتجنب التكرار.
6. `SEARCH_INDEXING_MODE` default هو `blog_only`. عنده `educationPageRobots` يفرض `noindex` على التعليم، وتستبعد كل كيانات التعليم من Sitemap. في `full` يحترم `SeoMeta.noindex`.

الأدلة: `prisma/schema.prisma`, `src/validations/seo-meta.ts`, `src/components/admin/seo/`, `src/app/[cc]/[type]/universities/[...slug]/page.tsx`, `src/app/sitemap.ts`, `src/lib/search-indexing.ts`.

## 11. PDF and Attachment Findings

### Model

`Attachment` كيان Polymorphic بواسطة `ownerType + ownerId`. الأنواع المالكة تشمل `question`, `quiz`, `chapter`, `subject`, `blog_post`, `study_summary`. يدعم نوع الملف `image`, `pdf`, `solution`, `other`، ومزود التخزين والرؤية والـbucket/key وmetadata الملف.

### ما هو مطبق للملخص

- `StudySummary.pdfAttachmentId` علاقة مباشرة اختيارية.
- رفع PDF من Admin Summary متاح بعد وجود Summary ID، ويرفع جديدًا كـ`private`.
- تحقق الربط يقبل Attachment مملوكًا للملخص نفسه أو Subject أو Chapter المطابق.
- الطالب لا يحصل على `bucket`, `storageKey`, signed URL أو private URL من بيانات Summary.
- الزر يفتح `GET /api/v1/student/summaries/{id}/pdf`؛ Endpoint يعيد التحقق من النشر والملف والوصول ثم redirect إلى signed URL مؤقت للـR2 الخاص.
- Summary بلا وصول لا يجلب `contentHtml`, `contentText` أو رابط PDF المحمي.

### Chapter والملفات الأصلية

- **Fact:** Enum يسمح بـAttachment مالكه Chapter أو Subject.
- **Fact:** لا توجد علاقة Prisma صريحة `Chapter.attachments`; الملكية Polymorphic فقط.
- **Fact:** لم يثبت وجود UI عامة لرفع أو عرض ملفات Chapter الأصلية للطالب.
- عدم رفع ملفات المقرر الأصلية لا يتعارض مع العقد الحالي؛ تجربة الطالب الحالية لا تعتمد عليها.
- لا يوجد Model لتوثيق مصدر خارجي، provenance، رقم صفحة المصدر أو نسخة الملف المستخدم في إنتاج Summary.

الأدلة: `prisma/schema.prisma`, `src/app/api/v1/admin/attachments/route.ts`, `src/components/admin/summaries/summary-dialog.tsx`, `src/app/api/v1/student/summaries/[id]/pdf/route.ts`.

## 12. APIs, Routes, Actions, and Services

| الوظيفة | Route/Action | Input مختصر | Output مختصر | Validation/حماية | الملفات |
|---|---|---|---|---|---|
| CRUD المؤسسات | `/api/v1/admin/universities`, `/[id]` | University fields | list/entity | Zod + `verifyAdmin` | `src/validations/university.ts`, `src/app/api/v1/admin/universities/` |
| CRUD Majors | `/api/v1/admin/majors`, `/[id]` | Major fields | list/entity | Zod + Admin | `src/validations/major.ts`, `src/app/api/v1/admin/majors/` |
| CRUD Subjects | `/api/v1/admin/subjects`, `/[id]` | Subject fields | list/entity | Zod + Admin | `src/validations/subject.ts`, `src/app/api/v1/admin/subjects/` |
| CRUD Chapters | `/api/v1/admin/chapters`, `/[id]` | Chapter fields | list/entity | Zod + Admin | `src/validations/chapter.ts`, `src/app/api/v1/admin/chapters/` |
| CRUD Summaries | `/api/v1/admin/summaries`, `/[id]` | content/status/access/PDF | list/entity | Zod، تطابق Subject/Chapter/Attachment، Admin | `src/validations/study-summary.ts`, `src/app/api/v1/admin/summaries/` |
| CRUD Questions | `/api/v1/admin/questions`, `/[id]` | Question + options | list/entity | Zod + Admin | `src/validations/question.ts`, `src/app/api/v1/admin/questions/` |
| Import Questions | `POST /api/v1/admin/questions/import` | `{chapterId, items, duplicateStrategy}` | imported/skipped | Import Zod + transaction + Admin | `src/validations/question-import.ts`, import route |
| Generate/List Quiz | `/api/v1/admin/quizzes` | generation settings | Quiz | Zod + Admin | `src/validations/quiz.ts`, quizzes route |
| Edit Quiz | `/api/v1/admin/quizzes/[id]` | editable Quiz fields/questions حسب route | Quiz | Admin | `src/app/api/v1/admin/quizzes/[id]/route.ts` |
| SEO CRUD | `/api/v1/admin/seo-meta`, `/[id]` | SeoMeta fields | list/entity | Zod + Admin | `src/validations/seo-meta.ts`, SEO routes |
| SEO owner picker | `/api/v1/admin/seo-meta/owners` | owner type + hierarchy/query | IDs + labels/chains | Admin | `src/app/api/v1/admin/seo-meta/owners/route.ts` |
| Attachment upload/list | `/api/v1/admin/attachments` | multipart/file metadata | Attachment | file/type/size/purpose + Admin | `src/validations/attachment.ts`, attachments route |
| Education detail route | `/{cc}/{type}/universities/[...slug]` | hierarchical slugs | University/Major/Subject/Quiz/Summary page | route parser + entity APIs | catch-all page |
| Subject summaries | Server helper | subjectId | public cards without protected body | published/date/language filters + cache | `src/lib/server/study-summaries.ts` |
| Summary protected body | Server helper | summaryId | HTML/Text | يستدعى بعد access فقط | `getPublishedStudySummaryContent` |
| Summary PDF | `/api/v1/student/summaries/[id]/pdf` | summary ID | redirect/error | publication + access + attachment checks، no-store | PDF route |
| Quiz runtime | `/api/v1/student/quizzes/by-id/[id]` | quiz ID/session | Quiz questions | access + no-store | runtime route |
| Quiz grade | `POST /api/v1/student/quizzes/grade` | answers | score + attempt | access + DB grading + no-store | grade route |
| Access | `checkQuizAccess`, `checkStudySummaryAccess` | entity/session | allowed/reason/context | PaidAccessPlan/entitlement | `src/lib/server/access-control.ts` |
| Cache invalidation | `revalidate*Cache` helpers | affected IDs/old-new snapshots | tag/path invalidation | server-only mutation flow | `src/lib/cache-invalidation.ts` |

Admin Actions المقابلة موجودة في `src/app/admin/{universities,majors,subjects,chapters,summaries,questions,quiz-generator,quizzes,seo-meta}/actions.ts`.

## 13. Shared Engine vs University-Specific Behavior

### المشترك فعليًا

- Models `University -> Major -> Subject -> Chapter -> Question` نفسها لكل `university`, `school`, `academy`.
- StudySummary، Quiz، Question import، Renderer، access control، SEO owner types وAdmin forms الأساسية مشتركة.
- مسارات التفاصيل تستخدم `/{cc}/{type}` والمكونات نفسها: `UniversityHero`, `MajorsList`, `MajorDetails`, `SubjectDetails`, `QuizDetails`, `StudySummaryDetails`.
- الأكاديمية ليست Model منفصلًا؛ هي `University.institutionType = academy`.

### المختلف فعليًا

- University فقط تفعّل واجهة اختيار `degreeType` عندما توجد أكثر من مجموعة درجات. School وAcademy لا تستخدمان هذه الخطوة في العرض العام.
- Academy فقط يمكن أن تكون `visibility = global` في منطق الإدارة والعرض؛ University وSchool يعاملان country-specific.
- labels والوصف تختلف حسب config، لكن بنية البيانات لا تختلف.
- countryCode يبقى موجودًا حتى للأكاديمية global، ويستخدم كسجل أصل بينما يسمح العرض العام للأكاديمية بالظهور عبر دول متعددة.

### قابلية إعادة الاستخدام

**Fact:** عقود Summary HTML والأسئلة والاستيراد وQuiz نفسها قابلة لإعادة الاستخدام في محتوى الجامعات لأنها مستخدمة أصلًا عبر المحرك المشترك.
**لكن:** نظام إنتاج الجامعات يحتاج قواعد محتوى إضافية خارج Schema، مثل مصدر المقرر، الالتزام بالفصل الجامعي، أسماء المقرر/الجامعة، وسياسة الفصل الواحد. لا يوجد Contract جامعة خاص يفرض هذه القواعد حاليًا.

الأدلة: `prisma/schema.prisma`, `src/config/regions.ts`, `src/lib/route-helpers.ts`, catch-all page، ومكونات public details.

## 14. Proven Facts

1. التسلسل الأساسي `University -> Major -> Subject -> Chapter -> Question` مثبت بعلاقات Prisma وCascade. الدليل: `prisma/schema.prisma`.
2. لا توجد صفحة Chapter عامة ولا segment `chapters` في parser الحالي. الدليل: `src/app/[cc]/[type]/universities/[...slug]/page.tsx`.
3. StudySummary تابع لـSubject وارتباطه بـChapter اختياري. الدليل: `StudySummary.subjectId` و`chapterId?` في Prisma.
4. المحتوى الغني المعروض فعليًا هو `contentHtml`، مع `contentText` fallback؛ `content Json?` لا يستهلكه العرض العام المثبت. الدليل: `study-summary-details.tsx`, `study-summaries.ts`.
5. Summary المنشور لا يظهر بلا `publishedAt <= now`. الدليل: `src/lib/server/study-summaries.ts`.
6. سؤال واحد ينتمي مباشرة إلى Chapter واحد، وترتيبه داخل Quiz فقط عبر `QuizQuestion`. الدليل: Prisma.
7. Admin اليدوي وImport يدعمان MCQ وTF فقط، رغم أن Prisma يعرف أربعة أنواع. الدليل: `question-dialog.tsx`, `question-import.ts`, `schema.prisma`.
8. `tfAnswer` حقل Import فقط وليس حقل DB؛ يتحول إلى خيارين. الدليل: import route وPrisma.
9. Quiz لا يملك `chapterId`؛ يمكن توليده من عدة Chapters. الدليل: Prisma و`src/app/api/v1/admin/quizzes/route.ts`.
10. لا يوجد قيد يفرض Quiz واحدًا أو Summary واحدًا لكل Chapter. الدليل: غياب العلاقات/unique constraints المقابلة في Prisma.
11. SEO مركزي في `SeoMeta`، لكن اكتمال استهلاكه يختلف حسب المستوى. الدليل: Prisma، Admin SEO، catch-all metadata.
12. ملفات الفصل الأصلية ليست جزءًا لازمًا من العرض الحالي؛ PDF المطبق للطالب هو مرفق Summary عبر Endpoint آمن. الدليل: Summary PDF flow.
13. وضع الفهرسة الافتراضي `blog_only` يجعل صفحات التعليم noindex وخارج Sitemap. الدليل: `src/lib/search-indexing.ts`, `src/app/sitemap.ts`.
14. لا يوجد Import شامل للحزمة التعليمية؛ الاستيراد المنظم الوحيد المثبت هنا هو Questions import. الدليل: Admin/API search و`src/components/admin/questions/import-questions-dialog/`.

## 15. Unknowns and Gaps

1. **صفحة Chapter مفقودة:** لا يوجد قرار مطبق حول Route أو UI يجمع Summary وQuiz لكل Chapter.
2. **Cardinality غير محسومة:** لا يوجد قيد ملخص واحد أو Quiz واحد لكل Chapter، ولا field يحدد "الملخص الأساسي" أو "اختبار الفصل الأساسي".
3. **Quiz متعدد الفصول:** النظام يسمح به؛ لا يوجد Contract يقرر هل محتوى الجامعات سيمنعه تنظيميًا.
4. **Provenance مفقود:** لا يوجد تخزين لمصدر PDF/Word الخارجي، الإصدار، الصفحات المرجعية أو سجل تدقيق المحتوى الناتج.
5. **Import الحزمة مفقود:** لا يوجد API/transaction موحد لإدخال Chapter + Summary + Questions + Quiz + SEO.
6. **HTML Sanitization محدود:** الدفاع الحالي Regex ومخصص لمحتوى Admin موثوق، وليس Sanitizer allowlist عامًا.
7. **Types متعارضة:** Prisma وRuntime يدعمان short/essay، Admin/Import لا يدعمان إنتاجهما، والتصحيح الحالي لهما لا يقيس الصحة.
8. **MCQ constraint غير كامل:** Server Validation يسمح بأكثر من إجابة صحيحة بينما Runtime يصحح مقارنة بأول correct option.
9. **تسريب الإجابة للعميل:** Runtime payload يتضمن `isCorrect` و`explanation` قبل الإرسال.
10. **SEO Major غير مكتمل:** SeoMeta يمكن إدارته والـslug يستخدم، لكن Metadata override لا يطبق في صفحة Major الحالية.
11. **SEO Chapter غير مستهلك:** يمكن إنشاؤه إداريًا بلا صفحة عامة أو Sitemap.
12. **Canonical/Schema gaps:** `canonicalUrl` و`schemaJson` لا يستهلكان في صفحات التفاصيل التعليمية كما تخزنهما الإدارة.
13. **`content Json` غير محسوم:** موجود في StudySummary لكن لا يوجد Renderer عام مثبت له.
14. **لا اختبارات عقدية:** لم يعثر على tests/fixtures تثبت import أو renderer أو route contracts.
15. **Seed قديم:** لا يغطي Summary/Quiz/SEO ويحتوي نصوصًا مشوهة، فلا يصلح Production reference.
16. **بيانات الإنتاج غير مفحوصة:** لم يثبت مدى التزام السجلات الحالية بالقواعد أو وجود قيم legacy شاذة.
17. **Sitemap وAcademy global:** توليد مسارات التعليم يعتمد `university.countryCode` لسجل واحد؛ لم يثبت توليد نسخة لكل دولة لأكاديمية global عند وضع `full`.

## 16. Decisions Needed Before Content-System Design

هذه قرارات مطلوبة، وليست توصيات منفذة:

1. **تجربة Chapter:** هل ينشأ Public Chapter route حقيقي، أم يستمر العرض داخل Subject مع grouping حسب Chapter؟
2. **قاعدة الحزمة:** هل كل Chapter يجب أن يملك Summary أساسيًا واحدًا وQuiz أساسيًا واحدًا؟ وكيف يميزان عن موارد إضافية؟
3. **حدود Quiz:** هل Quiz الجامعي يجب أن يقتصر على Chapter واحد، مع بقاء المحرك العام قادرًا على عدة Chapters؟
4. **صيغة Summary القياسية:** هل يعتمد الإنتاج `contentHtml` فقط مع `contentText` مشتق، أم يستخدم `content Json` بعقد Renderer جديد؟
5. **سلامة HTML:** هل المحتوى سيظل Trusted Admin HTML، أم يلزم Sanitizer allowlist قبل أي إدخال آلي واسع؟
6. **عقد الأسئلة:** هل يقتصر الإنتاج على MCQ/TF؟ وهل تفرض إجابة صحيحة واحدة بالضبط لـMCQ؟
7. **حماية الاختبار:** هل تبقى الإجابات الصحيحة في Runtime payload، أم تنقل المراجعة/النتائج إلى تدفق Server آمن؟
8. **Import workflow:** هل الإنتاج نسخ يدوي متسلسل، أم حزمة قابلة للتحقق ثم استيراد ذري/مرحلي مع IDs الناتجة؟
9. **SEO routing:** هل `SeoMeta.slug` يبقى مصدر routing لبعض الكيانات وoverride فقط للملخص، أم يوحد العقد؟
10. **SEO completeness:** هل يجب أن تستهلك Major/Chapter و`canonicalUrl/schemaJson` قبل توليد SEO آلي لها؟
11. **Source audit:** أين يحفظ خارج النظام سجل المصدر والإصدار والصفحات التي استند إليها Summary/Question؟
12. **لغة الإنتاج:** هل الإنتاج الجامعي عربي فقط الآن، رغم وجود `ar/en` في Schema؟
13. **معيار النشر:** ما شروط التحويل من draft/noindex إلى published/indexable لكل Chapter package؟
14. **Audit tools:** هل التحقق المطلوب ساكن على الملفات فقط، أم يقارن أيضًا السجلات المنشأة عبر read-only API بعد الإدخال؟

## 17. Evidence Index

### البنية وقاعدة البيانات

- `package.json`: الإطار والحزم والسكريبتات.
- `prisma/schema.prisma`: المصدر الأساسي للنماذج والعلاقات والEnums والقيود.
- `prisma/migrations/20250914135854_add_exam_tables_and_attachments/migration.sql`: إزالة علاقات Quiz القديمة المباشرة وإضافة المرفقات تاريخيًا.
- `prisma/migrations/20260624134557_add_study_summaries/migration.sql`: إنشاء StudySummary.
- `prisma/migrations/20260702120000_add_study_summary_access_type/migration.sql`: إضافة accessType للملخص.
- `prisma/migrations/20260702143000_refine_attachment_storage_metadata/migration.sql`: metadata التخزين والرؤية.
- `prisma/migrations/20260715090000_add_institution_visibility/migration.sql`: global/country visibility.
- `prisma/migrations/20260725090000_remove_exam_papers_module/migration.sql`: حذف Exam Papers القديمة وتحديث Attachment owners.
- `prisma/seed.ts`: عينات hierarchy/questions القديمة وحدود seed الحالية.

### Validation والعقود

- `src/validations/university.ts`
- `src/validations/major.ts`
- `src/validations/subject.ts`
- `src/validations/chapter.ts`
- `src/validations/study-summary.ts`
- `src/validations/question.ts`
- `src/validations/question-import.ts`
- `src/validations/quiz.ts`
- `src/validations/seo-meta.ts`
- `src/validations/attachment.ts`

### الإدارة والإدخال

- `src/app/admin/universities/`, `src/components/admin/universities/`
- `src/app/admin/majors/`, `src/components/admin/majors/`
- `src/app/admin/subjects/`, `src/components/admin/subjects/`
- `src/app/admin/chapters/`, `src/components/admin/chapters/`
- `src/app/admin/summaries/`, `src/components/admin/summaries/`
- `src/app/admin/questions/`, `src/components/admin/questions/`
- `src/app/admin/quiz-generator/`, `src/components/admin/quizzes/generator/`
- `src/app/admin/quizzes/`, `src/components/admin/quizzes/`
- `src/app/admin/seo-meta/`, `src/components/admin/seo/`
- `src/app/api/v1/admin/`: CRUD وImport وowner picker والمرفقات.

### العرض العام والتشغيل

- `src/app/[cc]/[type]/universities/[...slug]/page.tsx`: Route parser وصفحات التفاصيل وMetadata.
- `src/app/[cc]/[type]/page.tsx`: صفحة قائمة نوع المؤسسة.
- `src/components/public/major-details.tsx`
- `src/components/public/subject-details.tsx`
- `src/components/public/subject-learning-switcher.tsx`
- `src/components/public/quiz-details.tsx`
- `src/components/public/study-summaries/subject-study-summaries.tsx`
- `src/components/public/study-summaries/study-summary-details.tsx`
- `src/components/public/study-summaries/copyable-summary-content.tsx`
- `src/components/shared/rich-question-content.tsx`: عقد markup للأسئلة.
- `src/components/public/quiz/`: Runtime.
- `src/components/public/quiz/result/result-study-guidance.tsx`: تحليل النتيجة الحالي.

### Server وSEO والكاش والتخزين

- `src/lib/server/study-summaries.ts`: queries العامة، serialization، المحتوى المحمي، وتنظيف HTML.
- `src/lib/server/access-control.ts`: Quiz وSummary access.
- `src/lib/server/storage/`: R2 keys/client/signed URLs.
- `src/app/api/v1/student/quizzes/by-id/[id]/route.ts`: Runtime payload.
- `src/app/api/v1/student/quizzes/grade/route.ts`: التصحيح والمحاولة.
- `src/app/api/v1/student/summaries/[id]/pdf/route.ts`: PDF الآمن.
- `src/app/sitemap.ts`: شروط الإدراج ووضع الفهرسة.
- `src/lib/search-indexing.ts`: `blog_only/full` وrobots.
- `src/lib/cache-tags.ts`: أسماء tags وTTL والسياسات.
- `src/lib/cache-invalidation.ts`: invalidation المركزي.
- `docs/cache-vercel-checklist.md`: توقعات الكاش التشغيلية.

---

**حد هذا العقد:** يوثق ما يستطيع النظام الحالي تخزينه والتحقق منه وعرضه. لا يعني وجود field أو enum أن له UI إنتاج مكتمل أو Public route. أي نظام محتوى قادم يجب أن يبني على الحقائق المثبتة أعلاه، ويعامل عناصر القسم 15 كفجوات، وعناصر القسم 16 كقرارات تنتظر الاعتماد.

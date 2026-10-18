# 01 — عقد بيانات مستواك

هذا العقد يلخص الحقول التي يحتاجها مصنع المحتوى وفق الكود الحالي. عند تغير الكود، يجب تحديث هذا الملف قبل إنتاج حزمة جديدة.

## 1. التسلسل الأكاديمي الفعلي

```text
University (institutionType: university | academy | school)
  -> College? (للجامعة فقط، اختيارية)
  -> Major
  -> Subject
  -> Chapter
  -> Question
  -> Quiz عبر QuizQuestion
```

- لا يوجد جدول Country؛ الدولة هي `University.countryCode`.
- لا يوجد جدول Academic Level مستقل؛ تستخدم المادة `year` و`semester`.
- وجود College لا يغير URL التخصص ولا Payment Scope.
- `StudySummary` يتبع Subject دائمًا، ويمكن ربطه بـChapter اختياريًا.

## 2. بطاقة المؤسسة والتخصص والمادة

### University

| الحقل | القاعدة |
| --- | --- |
| `name` | مطلوب. |
| `code` | اختياري وفريد إن وجد. |
| `countryCode` | كود الدولة المعتمد، مثل `SA`. |
| `institutionType` | `university`, `academy`, `school`. |
| `visibility` | `country` أو `global`. |
| `city`, `region`, `logoUrl` | اختيارية. |
| `isActive` | قرار إداري، وليس ناتجًا تلقائيًا من المصنع. |

### College

تستخدم فقط عندما تكون المؤسسة `university`.

| الحقل | القاعدة |
| --- | --- |
| `universityId` | اختيار الجامعة من الإدارة. |
| `name` | مطلوب. |
| `slug` | مطلوب وفريد داخل الجامعة. |
| `code` | اختياري وفريد داخل الجامعة إن وجد. |
| `isActive` | لا يعطل التخصصات تلقائيًا. |

### Major

| الحقل | القاعدة |
| --- | --- |
| `universityId` | مطلوب. |
| `collegeId` | اختياري، ويجب أن تكون الكلية من الجامعة نفسها. |
| `name` | مطلوب. |
| `code`, `degreeType`, `durationYears` | اختيارية. |
| `isActive` | قرار إداري. |

### Subject

| الحقل | القاعدة |
| --- | --- |
| `majorId` | مطلوب. |
| `name` | مطلوب. |
| `code` | اختياري وفريد داخل التخصص إن وجد. |
| `creditHours` | عدد صحيح اختياري من 1 إلى 6. |
| `semester` | اختياري من 1 إلى 3. |
| `year` | اختياري من 1 إلى 6. |
| `description` | اختياري. |
| `isActive` | قرار إداري. |

في `academy` يفرض النظام `year=null` و`semester=null`. لا تفترض أن المادة الجامعية أو المدرسية تملك قيمًا إن لم توفرها بطاقة المادة.

## 3. Chapter

| الحقل | القاعدة الفعلية |
| --- | --- |
| `subjectId` | مطلوب ويُختار في الإدارة. |
| `name` | مطلوب. |
| `slug` | اختياري، حتى 160، وغير محجوز. |
| `chapterNumber` | عدد صحيح >= 1 أو فارغ، وفريد داخل المادة. |
| `description` | اختياري. |
| `learningObjectives` | مصفوفة نصوص غير فارغة. |
| `kind` | `theory` أو `practical`; الافتراضي `theory`. |
| `isActive` | Boolean. |

مرفقات الفصل الحالية PDF خاصة عبر R2 ولأغراض مقننة يديرها النظام؛ المصنع يجهز الملف وبياناته ولا يرفع الملف.

## 4. StudySummary

| الحقل | القاعدة الفعلية |
| --- | --- |
| `subjectId` | مطلوب. |
| `chapterId` | اختياري، لكنه مطلوب تشغيليًا لملخص فصل وربط مراجعة الأسئلة. |
| `title` | من 2 إلى 180 حرفًا. |
| `slug` | 1–190؛ حروف/أرقام/شرطة دون مسافات، ويحول إلى lowercase. |
| `excerpt` | اختياري حتى 700. |
| `contentHtml` | اختياري حتى 200000؛ لمسار `platform_html` فقط. |
| `contentText` | اختياري حتى 50000. |
| `pdfAttachmentId` | اختياري؛ يُحدد بعد رفع PDF الناتج يدويًا. |
| `status` | `draft`, `published`, `archived`. |
| `accessType` | `inherit`, `free`, `paid`. |
| `publishedAt` | اختياري. |
| `language` | `ar` أو `en`. لا توجد قيمة DB مستقلة لـbilingual. |
| `readingMinutes` | عدد صحيح موجب اختياري. |
| `sortOrder` | عدد صحيح؛ الافتراضي 0. |
| `isFeatured` | Boolean. |

يجب وجود واحد على الأقل من `contentHtml`, `contentText`, `pdfAttachmentId` عند الإنشاء.

### تمثيل نوع الملخص في المصنع

`summaryMode` حقل تشغيلي في ملفات المصنع فقط، وليس حقل DB:

- `print_attachment`: ينتج HTML كاملًا، ثم يحوله المشرف إلى PDF ويرفعه، ولا يُنسخ إلى `contentHtml`.
- `platform_html`: ينتج fragment ينسخ إلى `contentHtml`، ولا يتضمن `<html>`, `<head>`, `<style>`, `<script>`.
- `hybrid`: ينتج الاثنين فقط بقرار صريح؛ كلاهما يجب أن يطابق المصدر نفسه.

## 5. Question والاستيراد

### حقول الاستيراد المدعومة

| الحقل | القاعدة |
| --- | --- |
| `questionText` | مطلوب. |
| `questionType` | `multiple_choice` أو `true_false`. |
| `difficultyLevel` | `easy`, `medium`, `hard`; الافتراضي `medium`. |
| `points` | عدد صحيح موجب؛ المصنع يستخدم 1 افتراضيًا. |
| `explanation` | اختياري؛ حد الإدخال الفردي 2000 حرف. |
| `imageUrl` | HTTP/HTTPS صالح أو null. |
| `tags` | مصفوفة نصوص. |
| `reviewTopic` | اختياري حتى 200. |
| `reviewPage` | عدد صحيح >= 1 أو null. |
| `isActive` | Boolean. |
| `options` | لـMCQ؛ كائنات `{text,isCorrect}`. |
| `tfAnswer` | لـTrue/False؛ Boolean. |

صيغة الملف المقبولة: JSON array، أو كائن يحتوي `questions`/`items`/`data`، أو JSONL. قالب المصنع يستخدم JSON array لأنه الأقل التباسًا.

المشرف يختار `chapterId`, و`reviewSummaryId` الاختياري، و`duplicateStrategy` (`allow`, `skip`, `fail`) من الواجهة؛ لا تضعها داخل كل سؤال.

### قيود مهمة

- الـpreview الحالي يرفض MCQ ما لم توجد إجابة صحيحة واحدة بالضبط؛ سياسة المصنع تفرض ذلك أيضًا.
- الكود العام للإدخال الفردي يسمح نظريًا بأكثر من إجابة صحيحة لـMCQ؛ هذا المصنع لا يستخدم هذا الاستثناء.
- `reviewSummaryId` يجب أن يشير إلى Summary من Chapter السؤال نفسه.
- `reviewPage` يتطلب Summary مرتبطًا بملف PDF صالح.
- لا تضع UUID للملخص داخل JSON.
- `sourceId`, `sourcePage`, `learningObjective`, `questionStyle` حقول تدقيق خارجية فقط ولا يرسلها قالب الاستيراد.
- حقل `Question.language` موجود في DB (`ar|en`) لكنه غير مدعوم حاليًا في مسار الاستيراد الجماعي/واجهة السؤال. لذلك لا ترسل `language` في JSON؛ راجع هذه الفجوة قبل إطلاق بنك أسئلة إنجليزي مصنفًا كـ`en`.

## 6. Quiz

| الحقل | القاعدة الفعلية |
| --- | --- |
| `title` | مطلوب. |
| `questionCount` | 1–100 من الواجهة الحالية. |
| `timeLimit` | 1–180 دقيقة. |
| `difficulty` | `mixed`, `easy`, `medium`, `hard`. |
| `questionTypes` | الأنواع المختارة. استخدم MCQ/TF في حزم الاستيراد الحالية. |
| `randomize` | Boolean. |
| `selectedChapters` | من 1 إلى 50 Chapter IDs. |
| `accessType` | `inherit`, `free`, `paid`. |
| `isFreePreview` | Boolean. |

Quiz يمكن أن يجمع أسئلة من عدة Chapters. مرجع المراجعة يبقى على Question نفسه، وليس Quiz.

## 7. SEO Meta

المالكون المتاحون: `university`, `college`, `major`, `subject`, `chapter`, `exam`, `blog_post`, `blog_topic`, `blog_tag`, `study_summary`.

| الحقل | القاعدة |
| --- | --- |
| `ownerType`, `ownerId`, `locale`, `slug` | تُحدد في شاشة الإدارة وليست ضمن ملف prefill. |
| `metaTitle`, `ogTitle` | حتى 160. |
| `metaDescription`, `ogDescription` | حتى 320. |
| `ogImageUrl`, `canonicalUrl` | HTTP/HTTPS، حتى 500. |
| `noindex`, `nofollow` | Boolean. |
| `schemaJson` | كائن/مصفوفة JSON صالحة؛ الحد 64KB، عمق 20، 2000 node. |

استيراد SEO الحالي يقبل سجل JSON واحدًا فقط ويعبئ الحقول التالية: `metaTitle`, `metaDescription`, `ogTitle`, `ogDescription`, `ogImageUrl`, `canonicalUrl`, `noindex`, `nofollow`, `schemaJson`. أي حقل إضافي يؤدي إلى رفض الاستيراد.

## 8. حقول لا يخزنها النظام حاليًا

هذه تبقى في الأرشيف المحلي ولا تُرسل إلى API:

- source IDs, pages, excerpts, provenance.
- content version وreviewer وQA score.
- summaryMode.
- learning objective mapping على مستوى السؤال.
- questionStyle وmisconception target.
- primary/secondary keyword وsearch intent كحقول تخطيطية.


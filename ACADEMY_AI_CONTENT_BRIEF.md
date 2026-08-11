# دليل وبرومبت إنشاء محتوى المسارات التدريبية في مستواك بالذكاء الاصطناعي

استخدم هذا الملف كمرجع أو انسخه كما هو إلى ChatGPT أو أي أداة ذكاء اصطناعي عند طلب إنشاء بيانات أو محتوى لقسم **المسارات التدريبية** في منصة **مستواك**.

هذه المخرجات تُستخدم لمساعدة مالك الموقع على نسخ البيانات يدويًا إلى لوحة الإدارة، ولا تفترض وجود اتصال مباشر بالنظام.

الغرض من هذا الدليل أن يفهم نموذج الذكاء الاصطناعي:

- طبيعة منصة مستواك.
- معنى قسم `academy` داخل النظام.
- الاسم الظاهر للمستخدم والمسارات العامة.
- بنية البيانات من الأعلى إلى الأدنى.
- طريقة إنشاء المسارات، التخصصات، المواد، الاختبارات، الأسئلة، الملخصات، وبيانات SEO.
- القواعد التحريرية والأمنية لتجنب المحتوى المنسوخ أو الادعاءات غير الصحيحة.

---

## 1. نبذة عن منصة مستواك

**مستواك** منصة تعليمية عربية تساعد الطلاب والمتدربين على التدريب والمراجعة من خلال محتوى منظم حسب:

- الدولة.
- نوع القسم.
- المسار أو الجهة.
- التخصص أو التصنيف.
- المادة أو المهارة.
- الاختبارات التدريبية.
- الملخصات والشروحات.

تحتوي المنصة حاليًا على أقسام مثل:

- الجامعات.
- المدارس.
- المسارات التدريبية.
- المدونة.
- الملخصات.
- الاختبارات.

قسم `academy` مخصص للمحتوى التدريبي والمهاري، مثل:

- البرمجة.
- اللغة الإنجليزية.
- المحاسبة.
- الحاسب.
- المهارات المهنية.
- تطبيقات الأعمال.
- المهارات الرقمية.

الأسلوب المطلوب في المحتوى:

- عربي واضح ومباشر.
- عملي ومناسب للمتدربين.
- غير تسويقي بشكل مبالغ.
- لا يدعي اعتمادًا رسميًا.
- يركز على التعلم، التدريب، الفهم، والاستعداد.

---

## 2. الاسم الظاهر والمسار التقني

القسم الداخلي في النظام اسمه:

```text
academy
```

لكن الاسم الظاهر للمستخدم يجب أن يكون:

```text
المسارات التدريبية
```

المسار العام يبقى كما هو:

```text
/{cc}/academy
```

أمثلة:

```text
/SA/academy
/YE/academy
```

مهم جدًا:

- لا تغيّر route.
- لا تستخدم `/training` أو `/tracks` بدل `/academy`.
- لا تستخدم كلمة "جامعة" أو "مؤسسة جامعية" في النصوص الظاهرة للمستخدم عند الحديث عن `academy`.
- حتى لو كان الجدول الداخلي في قاعدة البيانات اسمه `University`، لا تذكر ذلك للمستخدم.
- استخدم للمستخدم عبارات مثل:
  - المسار التدريبي.
  - المجال التدريبي.
  - المهارة.
  - المادة التدريبية.
  - الاختبار التدريبي.
  - الملخص التدريبي.

---

## 3. البنية الداخلية ومعناها في academy

تستخدم المسارات التدريبية نفس الجداول العامة الموجودة في المنصة، لكن المعنى داخل قسم academy مختلف عن الجامعات.

### المعنى العملي لكل مستوى

| الكيان الداخلي | المعنى داخل academy | مثال |
|---|---|---|
| Academy / Institution | المسار التدريبي الكبير | أكاديمية البرمجة |
| Major | المسار الفرعي أو التصنيف | تطوير الويب، لغات البرمجة |
| Subject | المهارة أو المادة التدريبية | JavaScript، Python، Excel |
| Chapter | محور داخل المادة إن كان موجودًا | المتغيرات، الدوال، الجداول |
| Quiz | اختبار تدريبي داخل المادة أو المحور | اختبار أساسيات JavaScript |
| StudySummary | ملخص أو شرح للمادة أو المحور | ملخص المتغيرات في Python |

### الهرم الكامل

```text
المسار التدريبي الكبير
└── المسار الفرعي أو التصنيف
    └── المهارة أو المادة التدريبية
        ├── محور أو فصل اختياري
        ├── اختبار تدريبي
        └── ملخص أو شرح
```

### مثال برمجي

```text
أكاديمية البرمجة
└── لغات البرمجة
    └── Python
        ├── المتغيرات
        ├── اختبار أساسيات Python
        └── ملخص أساسيات Python
```

### مثال لغة إنجليزية

```text
مسار اللغة الإنجليزية
└── قواعد اللغة الإنجليزية
    └── الأزمنة
        ├── Present Simple
        ├── اختبار Present Simple
        └── ملخص Present Simple
```

---

## 4. المسارات العامة الحالية

تعمل صفحات المسارات التدريبية حسب الدولة.

الدول الحالية:

```text
SA = السعودية
YE = اليمن
```

### صفحة قائمة المسارات التدريبية

```text
/{cc}/academy
```

أمثلة:

```text
https://mustawak.com/SA/academy
https://mustawak.com/YE/academy
```

### صفحة المسار التدريبي الكبير

```text
/{cc}/academy/universities/{academySlug}
```

مثال:

```text
https://mustawak.com/SA/academy/universities/programming-academy
```

ملاحظة تقنية: كلمة `universities` موجودة في route الحالي لأسباب داخلية، لكن لا تستخدم كلمة "جامعات" في النص الظاهر للمستخدم داخل قسم academy.

### صفحة المسار الفرعي

```text
/{cc}/academy/universities/{academySlug}/majors/{majorSlug}
```

مثال:

```text
https://mustawak.com/SA/academy/universities/programming-academy/majors/programming-languages
```

### صفحة المادة أو المهارة

```text
/{cc}/academy/universities/{academySlug}/majors/{majorSlug}/subjects/{subjectSlug}
```

مثال:

```text
https://mustawak.com/SA/academy/universities/programming-academy/majors/programming-languages/subjects/python
```

### صفحة الاختبار

```text
/{cc}/academy/universities/{academySlug}/majors/{majorSlug}/subjects/{subjectSlug}/quizzes/{quizSlug}
```

مثال:

```text
https://mustawak.com/SA/academy/universities/programming-academy/majors/programming-languages/subjects/python/quizzes/python-variables-quiz
```

### صفحة الملخص

```text
/{cc}/academy/universities/{academySlug}/majors/{majorSlug}/subjects/{subjectSlug}/summaries/{summarySlug}
```

مثال:

```text
https://mustawak.com/SA/academy/universities/programming-academy/majors/programming-languages/subjects/python/summaries/python-variables-summary
```

---

## 5. سياسة اللغة

الواجهة الحالية عربية.

القواعد:

- الأسماء الظاهرة تكون عربية قدر الإمكان.
- المصطلحات التقنية يمكن أن تبقى إنجليزية إذا كانت معروفة أو أدق، مثل:
  - Python
  - JavaScript
  - HTML
  - CSS
  - IELTS
  - Excel
  - SQL
  - Git
- يفضل أن تكون slugs إنجليزية قصيرة وواضحة.
- لا ننشئ صفحات إنجليزية كاملة الآن.
- لا نستخدم `/en` الآن.
- لا نستخدم hreflang الآن.
- لا نضيف محتوى إنجليزيًا قابلًا للأرشفة إلا في مرحلة مستقبلية مستقلة.
- يمكن استخدام جملة عربية تحتوي مصطلحًا إنجليزيًا عند الحاجة.

أمثلة جيدة:

```text
تعلم أساسيات Python من خلال أسئلة تدريبية قصيرة.
اختبر فهمك لمفهوم المتغيرات في JavaScript.
راجع أهم دوال Excel المستخدمة في الجداول.
```

تجنب:

```text
Official Python Exam
اختبار رسمي معتمد في JavaScript
شهادة مضمونة بعد اجتياز الاختبار
```

---

## 6. قواعد slugs

يفضل أن تكون slugs:

- إنجليزية.
- قصيرة.
- واضحة.
- بحروف صغيرة.
- تستخدم الشرطة `-` بين الكلمات.
- بدون مسافات.
- بدون رموز خاصة.
- لا تحتوي على كلمات عامة جدًا إذا أمكن.

### Academy slugs

```text
programming-academy
english-academy
accounting-academy
computer-skills-academy
professional-skills-academy
```

### Major slugs

```text
web-development
programming-languages
english-grammar
financial-accounting
office-applications
digital-skills
```

### Subject slugs

```text
javascript
python
html-css
english-tenses
microsoft-excel
financial-statements
computer-basics
```

### Quiz slugs

```text
javascript-basics-quiz
python-variables-quiz
present-simple-quiz
excel-formulas-quiz
financial-statements-quiz
```

### Summary slugs

```text
python-variables-summary
javascript-functions-summary
present-simple-summary0
excel-formulas-summary
financial-statements-summary
```

---

## 7. أمثلة على تنظيم المسارات التدريبية

### مسار البرمجة

```text
أكاديمية البرمجة
├── لغات البرمجة
│   ├── Python
│   ├── JavaScript
│   └── Java
├── تطوير الويب
│   ├── HTML و CSS
│   ├── JavaScript للويب
│   └── أساسيات React
└── أدوات المطور
    ├── Git
    └── سطر الأوامر
```

### مسار اللغة الإنجليزية

```text
مسار اللغة الإنجليزية
├── قواعد اللغة الإنجليزية
│   ├── الأزمنة
│   ├── Present Simple
│   └── Past Simple
├── المفردات
│   ├── مفردات العمل
│   └── مفردات الدراسة
└── اختبارات اللغة
    ├── IELTS Basics
    └── Reading Practice
```

### مسار المحاسبة

```text
مسار المحاسبة
├── المحاسبة المالية
│   ├── القيود اليومية
│   ├── القوائم المالية
│   └── الميزانية العمومية
└── مبادئ المحاسبة
    ├── الأصول والخصوم
    └── الإيرادات والمصروفات
```

### مسار مهارات الحاسب

```text
مسار مهارات الحاسب
├── أساسيات الحاسب
│   ├── مكونات الحاسب
│   └── أنظمة التشغيل
└── تطبيقات Office
    ├── Microsoft Excel
    ├── Microsoft Word
    └── PowerPoint
```

---

## 8. أنواع الطلبات التي يمكن طلبها من الشات

يمكنك طلب أي من المهام التالية:

- أنشئ مسارًا تدريبيًا كاملًا.
- أنشئ تخصصات لمسار تدريبي.
- أنشئ مواد داخل تخصص.
- أنشئ محاور أو فصولًا داخل مادة.
- أنشئ اختبارات لمادة.
- أنشئ 20 سؤال اختيار من متعدد لموضوع محدد.
- أنشئ أسئلة صح وخطأ لمفهوم محدد.
- أنشئ ملخصًا تدريبيًا لمادة.
- أنشئ SEO لصفحة معينة.
- حسّن وصف صفحة أو عنوان SEO.
- راجع جودة أسئلة موجودة.
- اقترح ترتيبًا تعليميًا من المبتدئ إلى المتوسط.
- اقترح أسماء slugs مناسبة.
- اقترح محتوى تجريبي مجاني ومسار مدفوع.

مثال طلب:

```text
أنشئ لي مسارًا تدريبيًا كاملًا داخل مستواك عن أساسيات Python، يشمل:
Academy، Major، Subject، Chapters، Quiz، 20 سؤال اختيار من متعدد، StudySummary، و SeoMeta.
التزم بقواعد ACADEMY_AI_CONTENT_BRIEF.md.
```

---

### ملاحظة قبل قوالب JSON التقنية

القوالب التالية بصيغة JSON هي **مرجع تقني لفهم الحقول والعلاقات فقط**.

الصيغة الافتراضية المطلوبة من الشات عند إنشاء بيانات عامة هي جداول Markdown منظمة، وليست JSON، لأن هذه البيانات غالبًا ستدخل يدويًا من لوحة الإدارة.

الاستثناء الوحيد هو الأسئلة `Questions`، إذ يفضل إخراجها بصيغة JSON منظمة لأنها قد تستخدم للاستيراد أو النسخ المنظم.

## 9. قالب Academy JSON

استخدم هذا القالب للمسار التدريبي الكبير.

```json
{
  "institutionType": "academy",
  "name": "أكاديمية البرمجة",
  "code": "programming-academy",
  "city": null,
  "region": null,
  "countryCode": "SA",
  "isActive": true,
  "publicLabel": "أكاديمية البرمجة",
  "slug": "programming-academy",
  "description": "مسار تدريبي يساعد المتدربين على تعلم أساسيات البرمجة والتدرّب على مفاهيمها من خلال مواد واختبارات منظمة."
}
```

قواعد مهمة:

- `institutionType` يجب أن يكون `academy`.
- استخدم `name` عربيًا قدر الإمكان.
- استخدم `code` أو `slug` إنجليزيًا واضحًا.
- لا تكتب في الوصف أنها جامعة.
- لا تذكر اعتمادًا رسميًا.
- لا تجعل الوصف عامًا جدًا.

---

## 10. قالب Major JSON

يمثل `Major` المسار الفرعي أو التصنيف داخل المسار التدريبي.

```json
{
  "academySlug": "programming-academy",
  "name": "لغات البرمجة",
  "code": "programming-languages",
  "degreeType": "other",
  "durationYears": null,
  "isActive": true,
  "description": "تصنيف تدريبي يضم مواد تساعد المتدرب على فهم لغات البرمجة الأساسية والتدرّب على مفاهيمها."
}
```

قواعد:

- لا تستخدم `degreeType` بمعنى شهادة حقيقية هنا.
- القيمة المناسبة غالبًا: `other`.
- الاسم الظاهر يكون عربيًا.
- الـ slug أو code يكون إنجليزيًا.

---

## 11. قالب Subject JSON

يمثل `Subject` المهارة أو المادة التدريبية.

```json
{
  "majorSlug": "programming-languages",
  "name": "Python",
  "code": "python",
  "creditHours": null,
  "semester": null,
  "year": null,
  "description": "مادة تدريبية تشرح أساسيات Python وتساعد المتدرب على اختبار فهمه للمفاهيم الأولى مثل المتغيرات، الأنواع، والشروط.",
  "isActive": true
}
```

قواعد:

- يمكن أن يكون الاسم إنجليزيًا إذا كان اسم التقنية نفسه، مثل Python أو JavaScript.
- الوصف يكتب بالعربية.
- لا تجعل المادة واسعة جدًا إذا كان الأفضل تقسيمها.
- اجعل كل مادة قابلة لإضافة اختبارات وملخصات واضحة.

---

## 12. قالب Chapter JSON

يمثل `Chapter` محورًا داخل المادة، وهو اختياري لكنه مفيد لتنظيم الأسئلة.

```json
{
  "subjectSlug": "python",
  "name": "المتغيرات وأنواع البيانات",
  "chapterNumber": 1,
  "description": "محور يشرح كيفية تعريف المتغيرات وفهم أنواع البيانات الأساسية في Python.",
  "learningObjectives": [
    "فهم معنى المتغير",
    "التفريق بين النصوص والأرقام",
    "قراءة كود بسيط يستخدم المتغيرات"
  ],
  "isActive": true
}
```

قواعد:

- اجعل كل محور يركز على فكرة واحدة أو مجموعة أفكار قريبة.
- لا تخلط أكثر من موضوع كبير داخل محور واحد.
- استخدم learningObjectives مختصرة وواضحة.

---

## 13. قالب Quiz JSON

يمثل `Quiz` اختبارًا تدريبيًا.

```json
{
  "subjectSlug": "python",
  "chapterName": "المتغيرات وأنواع البيانات",
  "title": "اختبار أساسيات المتغيرات في Python",
  "slug": "python-variables-quiz",
  "description": "اختبار تدريبي قصير يقيس فهمك لمفهوم المتغيرات وأنواع البيانات الأساسية في Python.",
  "timeLimit": 15,
  "totalQuestions": 20,
  "accessType": "inherit",
  "isFreePreview": false,
  "isActive": true
}
```

قواعد:

- العنوان يجب أن يوضح الموضوع.
- لا تستخدم كلمة "رسمي" أو "معتمد".
- لا تجعل الاختبار طويلًا جدًا للمبتدئين.
- 10 إلى 20 سؤالًا مناسب كبداية.
- `accessType` يمكن أن يكون:
  - `inherit`
  - `free`
  - `paid`

---

## 14. قالب Question JSON

كل سؤال تدريبي يجب أن يحتوي على:

- `questionText`
- `questionType`
- `difficultyLevel`
- `options` إذا كان السؤال اختيارًا من متعدد أو صح/خطأ
- `explanation`

قيم `questionType` الفعلية في النظام:

- `multiple_choice`
- `true_false`
- `short_answer`
- `essay`

مهم:

- واجهة الإدارة الحالية تستخدم عمليًا `multiple_choice` و`true_false`.
- لا تستخدم قيمًا مثل `MCQ` أو `TF` أو `multipleChoice`.
- لا تستخدم الحقل `type` في قالب السؤال، استخدم `questionType`.
- استخدم `difficultyLevel` وليس `difficulty`.

```json
{
  "quizSlug": "python-variables-quiz",
  "chapterName": "المتغيرات وأنواع البيانات",
  "questionText": "ما وظيفة المتغير في Python؟",
  "questionType": "multiple_choice",
  "difficultyLevel": "easy",
  "points": 1,
  "options": [
    {
      "optionText": "تخزين قيمة يمكن استخدامها لاحقًا",
      "isCorrect": true,
      "optionOrder": 1
    },
    {
      "optionText": "تشغيل البرنامج فقط",
      "isCorrect": false,
      "optionOrder": 2
    },
    {
      "optionText": "حذف البيانات من الذاكرة",
      "isCorrect": false,
      "optionOrder": 3
    },
    {
      "optionText": "تحويل Python إلى لغة أخرى",
      "isCorrect": false,
      "optionOrder": 4
    }
  ],
  "explanation": "المتغير يستخدم لتخزين قيمة باسم محدد حتى يمكن الرجوع إليها أو تعديلها أثناء تنفيذ البرنامج.",
  "tags": ["Python", "المتغيرات"],
  "isActive": true
}
```

مثال سؤال صح/خطأ:

```json
{
  "quizSlug": "python-variables-quiz",
  "chapterName": "المتغيرات وأنواع البيانات",
  "questionText": "يمكن تغيير قيمة المتغير في Python بعد تعريفه.",
  "questionType": "true_false",
  "difficultyLevel": "easy",
  "points": 1,
  "options": [
    {
      "optionText": "true",
      "isCorrect": true,
      "optionOrder": 1
    },
    {
      "optionText": "false",
      "isCorrect": false,
      "optionOrder": 2
    }
  ],
  "explanation": "في Python يمكن إعادة إسناد قيمة جديدة إلى المتغير بعد تعريفه.",
  "tags": ["Python", "المتغيرات"],
  "isActive": true
}
```

### قواعد مهمة للأسئلة

- الأسئلة يجب أن تكون أصلية وغير منسوخة.
- لا تنسخ من اختبارات رسمية أو منصات تعليمية أو كتب محمية.
- لا تدّعِ أن الاختبار رسمي أو معتمد.
- نوّع الصعوبة:
  - `easy`
  - `medium`
  - `hard`
- اجعل الشرح مختصرًا وواضحًا.
- لا تكثر من الأسئلة الخادعة.
- لا تجعل كل الإجابات الصحيحة في نفس الخيار.
- لا تستخدم أسئلة مبهمة.
- لا تضع أكواد طويلة جدًا في السؤال إلا عند الحاجة.
- لا تجعل أكثر من إجابة صحيحة إذا كان السؤال اختيارًا واحدًا.
- تجنب العبارات مثل "كل ما سبق" إلا إذا كانت ضرورية.
- لا تستخدم أسئلة تعتمد على الحفظ فقط إذا كان الهدف فهم المفهوم.

### توزيع مقترح للصعوبة في 20 سؤالًا

```text
easy: 8 أسئلة
medium: 8 أسئلة
hard: 4 أسئلة
```

---

## 15. سياسة خاصة بالمحتوى التقني

في البرمجة والمهارات التقنية:

- يمكن استخدام مصطلحات إنجليزية داخل النص العربي.
- الأسئلة البرمجية يجب أن تكون واضحة وقابلة للحل.
- إذا كان السؤال يحتوي كودًا، استخدم code block أو نصًا واضحًا.
- لا تضع كودًا كبيرًا جدًا داخل السؤال.
- اجعل السؤال يختبر مفهومًا واحدًا قدر الإمكان.
- لا تخلط syntax مع أكثر من فكرة في سؤال واحد إلا إذا كان السؤال متوسطًا أو متقدمًا.
- تأكد أن الكود لا يحتوي خطأ غير مقصود.
- لا تسأل عن تفاصيل نادرة جدًا في اختبار للمبتدئين.

مثال جيد:

```text
ما ناتج الكود التالي؟

```python
x = 5
y = 2
print(x + y)
```
```

مثال غير مناسب:

```text
ما ناتج برنامج طويل يحتوي 40 سطرًا ويستخدم أكثر من مفهوم متقدم؟
```

---

## 16. قالب StudySummary JSON

يمثل `StudySummary` ملخصًا أو شرحًا للمادة أو المحور.

```json
{
  "subjectSlug": "python",
  "chapterName": "المتغيرات وأنواع البيانات",
  "title": "ملخص المتغيرات وأنواع البيانات في Python",
  "slug": "python-variables-summary",
  "excerpt": "شرح مختصر يساعدك على فهم المتغيرات وأنواع البيانات الأساسية في Python قبل حل الاختبار.",
  "contentHtml": "<h2>ما هي المتغيرات؟</h2><p>المتغير هو اسم يستخدم لتخزين قيمة يمكن الرجوع إليها لاحقًا.</p>",
  "contentText": "المتغير هو اسم يستخدم لتخزين قيمة يمكن الرجوع إليها لاحقًا.",
  "pdfAttachmentId": null,
  "status": "draft",
  "language": "ar",
  "readingMinutes": 5,
  "sortOrder": 0,
  "isFeatured": false,
  "accessType": "inherit"
}
```

قواعد:

- يجب أن يحتوي الملخص على `contentHtml` أو `contentText` أو PDF لاحقًا.
- في المحتوى الحالي، يفضل توفير `contentHtml` و`contentText`.
- لا تستخدم HTML معقدًا.
- لا تضف `<script>` أو `<style>`.
- استخدم عناوين وفقرات وقوائم وجداول عند الحاجة.
- `accessType` يمكن أن يكون:
  - `inherit`: يرث من المادة أو الخطة.
  - `free`: مجاني.
  - `paid`: مدفوع.

---

## 17. قالب SeoMeta JSON

يمكن اقتراح SEO لكل مستوى.

أنواع المالك المهمة:

| المستوى | ownerType |
|---|---|
| المسار التدريبي الكبير | university |
| المسار الفرعي | major |
| المادة أو المهارة | subject |
| الاختبار | exam |
| الملخص | study_summary |

قالب:

```json
{
  "ownerType": "subject",
  "ownerIdHint": "python",
  "locale": "ar",
  "slug": "python",
  "metaTitle": "أساسيات Python للمبتدئين",
  "metaDescription": "تدرّب على أساسيات Python من خلال ملخصات وأسئلة منظمة تساعدك على فهم المتغيرات، الأنواع، والشروط بطريقة عملية.",
  "canonicalUrl": "https://mustawak.com/SA/academy/universities/programming-academy/majors/programming-languages/subjects/python",
  "ogTitle": "أساسيات Python للمبتدئين",
  "ogDescription": "محتوى تدريبي منظم لتعلم أساسيات Python واختبار فهمك خطوة بخطوة.",
  "ogImageUrl": null,
  "noindex": true,
  "nofollow": false,
  "schemaJson": null
}
```

### قواعد SEO مهمة

- لا تضف `| مستواك` داخل `metaTitle` لأن النظام قد يضيف اسم الموقع تلقائيًا.
- استخدم canonical على `https://mustawak.com`.
- لا تجعل `noindex = false` إلا إذا كانت الصفحة جاهزة وفيها محتوى كافٍ.
- في الوقت الحالي قد تكون صفحات academy `noindex` بسبب `blog_only indexing`، لكن نجهز SEO مستقبلًا.
- لا تستخدم كلمات مثل "رسمي" أو "معتمد" إلا إذا كان صحيحًا.
- لا تحشو الكلمات المفتاحية.
- اجعل العنوان طبيعيًا ومفيدًا.
- اجعل الوصف يشرح قيمة الصفحة بوضوح.
- لا تكرر نفس metaDescription لكل الصفحات.
- لا تجعل العنوان أطول من اللازم.

---

## 18. Schema JSON-LD اختياري

`schemaJson` اختياري وليس ضروريًا لكل صفحة.

استخدمه فقط للصفحات المهمة وعندما تكون البيانات واضحة.

قواعد:

- لا تضف بيانات وهمية مثل reviews أو ratings.
- لا تضف author وهمي.
- استخدم `publisher = مستواك`.
- إذا لم تكن متأكدًا، اجعل `schemaJson = null`.
- لا تستخدم schema لتقديم ادعاءات غير صحيحة.

مثال بسيط اختياري:

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "أساسيات Python للمبتدئين",
  "description": "محتوى تدريبي يساعد المتدرب على فهم أساسيات Python وحل أسئلة تدريبية منظمة.",
  "inLanguage": "ar",
  "publisher": {
    "@type": "Organization",
    "name": "مستواك",
    "url": "https://mustawak.com"
  }
}
```

---

## 19. سياسة الوصول المجاني والمدفوع

بعض المحتوى قد يكون مجانيًا وبعضه قد يكون مدفوعًا.

القيم المستخدمة:

```text
inherit
free
paid
```

### inherit

يرث من حالة المادة أو الخطة الحالية.

استخدمه كقيمة افتراضية إذا لم يكن هناك قرار واضح.

### free

المحتوى مجاني حتى لو كان المسار أو المادة مدفوعة.

مناسب للمحتوى التجريبي أو التعريفي.

### paid

المحتوى يحتاج صلاحية وصول حتى لو كانت المادة مجانية.

مناسب للمحتوى المتقدم أو الملخصات الخاصة.

---

## 20. سياسة ملفات PDF والملخصات

- PDF الخاص بالملخصات يدار كمرفق داخل النظام.
- لا تضع روابط PDF خارجية يدويًا داخل المحتوى.
- لا تكشف روابط تخزين خاصة.
- إذا لم يكن هناك PDF، اجعل `pdfAttachmentId = null`.
- يمكن إنشاء ملخص HTML/Text بدون PDF.
- عند اقتراح ملخص، ركز على جودة المحتوى النصي أولًا.

---

## 21. قواعد HTML للمحتوى

استخدم HTML بسيطًا ونظيفًا داخل `contentHtml`.

المفضل:

```html
<h2>عنوان القسم</h2>
<p>فقرة واضحة ومباشرة.</p>
<ul>
  <li>نقطة أولى</li>
  <li>نقطة ثانية</li>
</ul>
<table>
  <thead>
    <tr>
      <th>المفهوم</th>
      <th>الشرح</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>المتغير</td>
      <td>اسم يستخدم لتخزين قيمة.</td>
    </tr>
  </tbody>
</table>
```

تجنب:

- `<script>`
- `<style>`
- `style=""`
- iframes
- أكواد HTML معقدة.
- روابط تحميل مباشرة لملفات خاصة.

---

## 22. أمثلة طلبات جاهزة للشات

### طلب إنشاء مسار كامل

```text
اعمل ككاتب محتوى تعليمي لمنصة مستواك.
أريد إنشاء مسار تدريبي كامل عن "Python للمبتدئين" داخل قسم المسارات التدريبية.

أخرج البيانات العامة في جداول Markdown منظمة بالأعمدة:
الحقل | القيمة | ملاحظة الإدخال إن وجدت

واجعل الأسئلة فقط بصيغة JSON قابلة للاستيراد أو النسخ المنظم.

رتّب النتيجة بهذا الشكل:
- Academy Table
- Major Table
- Subject Table
- Chapters Table إن وجدت
- Quiz Table
- StudySummary Table
- SeoMeta Table لكل صفحة مهمة
- Questions JSON فقط

التزم بقواعد:
- الواجهة عربية.
- slugs إنجليزية قصيرة.
- الأسئلة أصلية وغير منسوخة.
- لا تستخدم كلمة رسمي أو معتمد.
- لا تضف "| مستواك" داخل metaTitle.
- اجعل noindex = true إذا كانت الصفحة غير جاهزة للأرشفة.
```

### طلب إنشاء أسئلة فقط

```text
أنشئ 20 سؤال اختيار من متعدد لمادة Python حول المتغيرات وأنواع البيانات.

لكل سؤال أخرج:
- questionText
- questionType = multiple_choice
- difficultyLevel
- options
  - optionText
  - isCorrect
  - optionOrder
- explanation

نوّع الصعوبة بين easy و medium و hard.
اجعل الأسئلة أصلية وواضحة وغير منسوخة.
لا تجعل كل الإجابات الصحيحة في نفس الخيار.
```

### طلب تحسين SEO

```text
راجع بيانات SEO التالية لمسار تدريبي في مستواك، وحسّنها بدون حشو كلمات مفتاحية.

مهم:
- لا تضف "| مستواك" في metaTitle.
- لا تستخدم كلمة رسمي أو معتمد.
- canonical يجب أن يكون على mustawak.com.
- إذا الصفحة غير مكتملة، اجعل noindex = true.
```

### طلب ملخص تدريبي

```text
أنشئ ملخصًا تدريبيًا عربيًا لمادة JavaScript حول الدوال.

أخرج:
- StudySummary Table بالأعمدة: الحقل | القيمة | ملاحظة الإدخال إن وجدت
- SeoMeta Table مقترح بالأعمدة: الحقل | القيمة | ملاحظة الإدخال إن وجدت

استخدم HTML بسيطًا فقط.
لا تستخدم script أو style.
```

---

## 23. ترتيب الإدخال في لوحة الإدارة

عند تجهيز مسار تدريبي جديد، يفضل إدخال البيانات تدريجيًا في لوحة الإدارة بهذا الترتيب:

1. إنشاء Academy / Institution
   - اجعل `institutionType = academy`.
   - استخدم اسمًا ظاهرًا مناسبًا مثل "أكاديمية البرمجة" أو "مسار اللغة الإنجليزية".
   - استخدم slug إنجليزيًا واضحًا مثل `programming-academy`.

2. إضافة SeoMeta للمسار إن كان جاهزًا
   - استخدم `ownerType = university` للمسار التدريبي الكبير.
   - اجعل `noindex = true` إذا لم يكتمل المحتوى بعد.
   - لا تضف `| مستواك` داخل `metaTitle`.

3. إنشاء Major
   - يمثل المسار الفرعي أو التصنيف.
   - مثال: لغات البرمجة، تطوير الويب، قواعد اللغة الإنجليزية.

4. إنشاء Subject
   - يمثل المادة أو المهارة التدريبية.
   - مثال: Python، JavaScript، Microsoft Excel.

5. إنشاء Chapters
   - أضف المحاور إذا كانت المادة تحتاج تنظيمًا داخليًا.
   - يمكن تخطيها إذا كانت المادة بسيطة، لكن وجودها يساعد في تنظيم الأسئلة.

6. إنشاء StudySummary
   - أضف ملخصًا أو شرحًا للمادة أو المحور.
   - لا تجعل صفحة المادة فارغة دون ملخص أو اختبار.

7. إنشاء Quiz
   - أضف اختبارًا تدريبيًا واضحًا مرتبطًا بالمادة أو المحور.

8. إضافة Questions
   - أضف أسئلة أصلية كافية.
   - راجع الإجابات والتوضيحات قبل النشر.

9. مراجعة واجهة الطالب
   - افتح صفحة المسار، المادة، الاختبار، والملخص.
   - تأكد أن النصوص لا تستخدم "جامعة" عند الحديث عن academy.
   - تأكد أن الروابط تعمل وأن الصفحة ليست فارغة.

10. إبقاء noindex حتى اكتمال المحتوى
   - لا تجعل الصفحة قابلة للأرشفة حتى يصبح المحتوى كافيًا ومراجعًا.
   - يمكن تجهيز SEO مبكرًا، لكن لا تفتح الأرشفة قبل اكتمال الصفحة.

---

## 24. الحد الأدنى لجاهزية الصفحة للأرشفة مستقبلًا

لا تعتبر صفحة المادة أو الاختبار جاهزة للأرشفة إلا إذا توفرت فيها الشروط التالية:

- اسم واضح ومفهوم للمستخدم.
- وصف كافٍ يشرح ما الذي سيتعلمه أو يتدرب عليه المستخدم.
- محتوى غير فارغ.
- وجود اختبار أو ملخص واحد على الأقل.
- أسئلة أصلية كافية إذا كانت الصفحة صفحة اختبار.
- توضيحات مختصرة ومفيدة للأسئلة.
- SEO مناسب بدون حشو كلمات مفتاحية.
- canonical صحيح على `https://mustawak.com`.
- لا توجد ادعاءات رسمية غير صحيحة.
- لا توجد روابط خاصة أو ملفات PDF مكشوفة.
- لا تستخدم أسماء جهات أو علامات تجارية بطريقة توحي بعلاقة رسمية غير موجودة.

إذا لم تتحقق هذه الشروط، اجعل:

```json
{
  "noindex": true
}
```

ملاحظة:

- قد تكون صفحات academy حاليًا `noindex` بسبب وضع `blog_only indexing`.
- هذا لا يمنع تجهيز البيانات وSEO الآن، لكنه يعني أن الأرشفة الفعلية تؤجل حتى فتح صفحات التعليم لاحقًا.

---

## 25. تنبيهات جودة إضافية

### القوالب إرشادية

بعض القوالب في هذا الملف إرشادية لتسهيل التفكير والتنظيم.

قوالب JSON الخاصة بـ Academy وMajor وSubject وChapter وQuiz وStudySummary وSeoMeta هي مراجع تقنية فقط، وليست صيغة الإخراج الافتراضية عند طلب إنشاء بيانات عامة من الشات.

الصيغة الافتراضية للبيانات العامة هي جداول Markdown منظمة، أما الأسئلة فقط فتبقى بصيغة JSON.

الإدخال النهائي يتم حسب الحقول المتاحة فعلًا في لوحة الإدارة. إذا اختلف اسم حقل في لوحة الإدارة عن القالب، استخدم الحقل الموجود في لوحة الإدارة ولا تفترض وجود حقل جديد.

لا تفترض وجود IDs جاهزة؛ النظام ينشئ IDs داخليًا بعد الحفظ.

### الأسماء التجارية والاختبارات المعروفة

قد تظهر أسماء تقنية أو تجارية مثل:

- IELTS
- TOEFL
- Microsoft Excel
- Python
- JavaScript
- HTML
- CSS
- React
- Git

عند استخدامها:

- لا تدّعِ أن المحتوى رسمي أو معتمد.
- لا تكتب أن الاختبار تابع للجهة المالكة للاسم أو العلامة.
- لا تستخدم عبارات مثل "اختبار IELTS الرسمي" أو "اختبار Microsoft المعتمد" إلا إذا كان ذلك صحيحًا وموثقًا.
- استخدم عبارات آمنة مثل:
  - اختبار تدريبي.
  - تدريب غير رسمي.
  - أسئلة تدريبية.
  - مراجعة مفاهيم.
  - تدريب على المهارات.

أمثلة جيدة:

```text
اختبار تدريبي على أساسيات Microsoft Excel.
أسئلة تدريبية غير رسمية لمراجعة Present Simple.
تدريب عملي على مفاهيم JavaScript للمبتدئين.
```

أمثلة يجب تجنبها:

```text
اختبار Microsoft Excel الرسمي.
اختبار IELTS المعتمد من مستواك.
شهادة Python رسمية بعد الاختبار.
```

### حجم المخرجات

- لا تنتج كمية كبيرة جدًا دفعة واحدة إلا إذا طلب المستخدم ذلك صراحة.
- للمرة الأولى يفضل إنشاء مادة واحدة مع اختبار واحد وملخص واحد للتجربة.
- لا تجعل كل المخرجات في JSON واحد ضخم.
- اجعل كل مستوى منفصلًا:
  - Academy
  - Major
  - Subject
  - Chapter
  - Quiz
  - Questions
  - StudySummary
  - SeoMeta
- إذا كان المطلوب كبيرًا، اقترح تقسيمه إلى دفعات.

---

## 26. Checklist قبل إدخال البيانات

قبل نسخ أي بيانات إلى لوحة الإدارة، راجع التالي:

- هل الاسم مناسب للمستخدم؟
- هل الاسم لا يستخدم "جامعة" عند الحديث عن academy؟
- هل slug إنجليزي وواضح؟
- هل الصفحة لن تكون فارغة؟
- هل الوصف كافٍ ومفيد؟
- هل الاختبار يحتوي أسئلة كافية؟
- هل الأسئلة أصلية؟
- هل الإجابات الصحيحة موزعة وليست كلها في نفس الخيار؟
- هل الشرح مختصر وواضح؟
- هل المحتوى التقني صحيح؟
- هل SEO لا يحتوي تكرار "مستواك"؟
- هل canonical على `https://mustawak.com`؟
- هل المحتوى مناسب للأرشفة مستقبلًا؟
- هل `noindex` مناسب لحالة جاهزية الصفحة؟
- هل لا توجد ادعاءات رسمية غير صحيحة؟
- هل لا توجد روابط ملفات خاصة أو روابط PDF مكشوفة؟
- هل لا توجد كلمات مفتاحية محشوة بشكل غير طبيعي؟

---

## 27. قرارات حالية يجب احترامها

- اسم القسم الظاهر للمستخدم: **المسارات التدريبية**.
- route يبقى: `/{cc}/academy`.
- لا نضيف دعم إنجليزي كامل الآن.
- لا نستخدم `/en`.
- لا نستخدم hreflang الآن.
- لا نغير الجداول أو schema من أجل هذا المحتوى.
- لا نفتح أرشفة صفحات academy إذا كان وضع الموقع الحالي يمنع صفحات التعليم.
- يمكن تجهيز SEO مستقبلًا حتى لو كانت الصفحة حاليًا `noindex`.
- لا نفترض أن النظام متصل بالشات أو يستقبل الإدخال تلقائيًا.

---

## 28. صيغة إخراج مفضلة من الذكاء الاصطناعي

عند طلب بيانات من الشات، اطلب أن تكون النتيجة منظمة بهذا الشكل:

```text
1. Academy Table
2. Major Table
3. Subject Table
4. Chapters Table إن وجدت
5. Quiz Table
6. StudySummary Table
7. SeoMeta Table
8. Questions JSON فقط
9. ملاحظات الجودة
10. Checklist قبل الإدخال
```

مهم:

- البيانات العامة مثل Academy وMajor وSubject وChapter وQuiz وStudySummary وSeoMeta تظهر افتراضيًا كجداول Markdown.
- الأسئلة فقط تظهر بصيغة JSON لأنها قد تستخدم للاستيراد أو النسخ المنظم.
- لا تخلط كل شيء في JSON واحد ضخم إلا إذا طُلب ذلك صراحة.
- اجعل كل مستوى منفصلًا ليسهل نسخه يدويًا.
- وضّح العلاقات باستخدام slugs أو أسماء واضحة.
- لا تفترض وجود IDs لأن IDs تنشأ داخل النظام.

### شكل الجدول المفضل

استخدم دائمًا الأعمدة التالية للبيانات العامة:

```markdown
| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
```

### مثال Academy Table

```markdown
| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
| institutionType | academy | قيمة داخلية ثابتة |
| name | أكاديمية البرمجة | الاسم الظاهر للمستخدم |
| code / slug | programming-academy | يفضل أن يكون إنجليزيًا قصيرًا |
| countryCode | SA | غيّرها إلى YE عند الحاجة |
| description | مسار تدريبي يساعد المتدربين على تعلم أساسيات البرمجة من خلال مواد واختبارات منظمة. | لا تستخدم كلمة جامعة |
| isActive | true | فعّلها عند جاهزية الحد الأدنى |
```

### مثال Major Table

```markdown
| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
| academySlug | programming-academy | للربط اليدوي بالمسار الكبير |
| name | لغات البرمجة | الاسم الظاهر |
| code / slug | programming-languages | slug إنجليزي واضح |
| degreeType | other | لا يمثل شهادة حقيقية هنا |
| description | تصنيف تدريبي يضم مواد تساعد المتدرب على فهم لغات البرمجة الأساسية. | وصف مختصر ومفيد |
| isActive | true | حسب الجاهزية |
```

### مثال Subject Table

```markdown
| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
| majorSlug | programming-languages | للربط اليدوي بالمسار الفرعي |
| name | Python | يمكن أن يبقى اسم التقنية بالإنجليزية |
| code / slug | python | قصير وواضح |
| description | مادة تدريبية تشرح أساسيات Python وتساعد المتدرب على اختبار فهمه للمفاهيم الأولى. | الوصف عربي |
| isActive | true | لا تنشر صفحة فارغة |
```

### مثال SeoMeta Table

```markdown
| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
| ownerType | subject | حسب المستوى: university / major / subject / exam / study_summary |
| ownerIdHint | python | مجرد تلميح يدوي، وليس ID حقيقيًا |
| locale | ar | الواجهة الحالية عربية |
| slug | python | نفس slug الصفحة عند الإمكان |
| metaTitle | أساسيات Python للمبتدئين | لا تضف "| مستواك" |
| metaDescription | تدرّب على أساسيات Python من خلال ملخصات وأسئلة منظمة تساعدك على فهم المتغيرات والأنواع والشروط. | بدون حشو كلمات مفتاحية |
| canonicalUrl | https://mustawak.com/SA/academy/universities/programming-academy/majors/programming-languages/subjects/python | استخدم mustawak.com |
| noindex | true | اتركها true حتى تكتمل الصفحة |
| schemaJson | null | اختياري فقط |
```

### Questions JSON فقط

عند إخراج الأسئلة، استخدم JSON فقط بهذا الشكل العام:

```json
[
  {
    "questionText": "ما وظيفة المتغير في Python؟",
    "questionType": "multiple_choice",
    "difficultyLevel": "easy",
    "points": 1,
    "options": [
      {
        "optionText": "تخزين قيمة يمكن استخدامها لاحقًا",
        "isCorrect": true,
        "optionOrder": 1
      },
      {
        "optionText": "تشغيل البرنامج فقط",
        "isCorrect": false,
        "optionOrder": 2
      }
    ],
    "explanation": "المتغير يستخدم لتخزين قيمة باسم محدد حتى يمكن الرجوع إليها لاحقًا.",
    "tags": ["Python", "المتغيرات"],
    "isActive": true
  }
]
```

## Academy Global Visibility Notes

Use these notes when preparing academy content for manual entry:

- `visibility = global` means the academy training path can appear in all supported countries, such as `/SA/academy` and `/YE/academy`, without duplicating the same record.
- `visibility = country` means the academy training path appears only under the stored `countryCode`.
- Keep `countryCode` required even for global academy records. Treat it as the primary/default country for the record, not as an exclusivity rule.
- Prefer `visibility = global` for general training content such as Python, JavaScript, Excel, English, accounting, and computer skills.
- Do not create a duplicate YE record when the same academy path is global.
- If `visibility = global`, avoid copy that implies the training path is specific to Saudi Arabia, Yemen, or any single country.
- This applies to `institutionType = academy` only. Universities and schools remain country-specific.

Suggested Academy table row:

```markdown
| visibility | global | استخدم global للمسارات العامة، أو country إذا كان المسار خاصًا بدولة واحدة |
```

## Latest Platform Update: Quiz Result Study Guidance

This section explains an important update that affects how academy content should be prepared.

The platform now shows a study guidance section after a student finishes a quiz. This feature is currently rule-based, not AI-generated inside the website. It analyzes the student's answers and suggests what to review next based on the existing content structure.

### What The Result Guidance Does

After a student submits a quiz, the result page can now show:

- The chapters or learning areas where the student made mistakes.
- The number of wrong or unanswered questions in each chapter.
- The question numbers that need review.
- The most repeated tags in wrong answers.
- A short note about difficulty level, such as whether mistakes were mostly in easy, medium, or hard questions.
- Suggested study summaries if published summaries exist for the same chapter.
- A direct link to review wrong questions.

This means content quality now affects the usefulness of result guidance. Good chapters, tags, explanations, and summaries will make the result page much more helpful.

### No AI Is Required Inside The Website For This Feature

The platform does not need built-in AI to provide this first version of guidance.

The current logic uses:

- `Question.chapterId`
- `Question.tags`
- `Question.difficultyLevel`
- `Question.explanation`
- `StudySummary.chapterId`
- published summaries connected to the same subject or chapter

AI tools can still help the site owner create better content before entering it into the admin panel, but the website itself currently gives guidance from structured data.

### What The AI Content Assistant Should Produce Differently

When generating academy content, the AI assistant should now pay extra attention to:

1. Creating clear chapters.
2. Assigning each question to the most relevant chapter.
3. Adding useful tags to every question.
4. Writing concise explanations for every question.
5. Creating optional study summaries for important chapters.
6. Keeping summaries aligned with the same chapter names and concepts used in questions.

If these fields are weak or missing, the result page can still work, but its guidance will be less specific.

### Chapter Guidance Requirements

Each Subject should preferably have clear chapters or learning units.

Good chapter examples for a Python subject:

| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
| subjectSlug | python | للربط اليدوي بالمادة |
| name | المتغيرات وأنواع البيانات | اسم واضح ومحدد |
| chapterNumber | 1 | ترتيب منطقي |
| description | يتعلم المتدرب معنى المتغيرات وأهم أنواع البيانات الأساسية في Python. | وصف مختصر |
| learningObjectives | تعريف المتغير، استخدام النصوص والأرقام، فهم التحويل بين الأنواع | أهداف قابلة للاختبار |

Avoid broad chapters such as:

- أساسيات عامة
- أشياء مهمة
- متفرقات

Use specific chapters because the result guidance depends on them.

### Question Tags Requirements

Tags should describe the exact concept being tested.

Good tags:

- Python
- المتغيرات
- أنواع البيانات
- input
- print
- الشروط
- الدوال
- القوائم
- Excel
- الصيغ
- الخلايا

Weak tags:

- مهم
- اختبار
- سؤال
- عام
- صعب

Recommended rule:

- Add 2 to 4 tags per question.
- Use repeated tags intentionally across questions that test the same concept.
- Do not create many slightly different tags for the same idea.
- Use the same spelling consistently.

Example:

```json
{
  "questionText": "ما ناتج الكود التالي؟\nprint(type(10))",
  "questionType": "multiple_choice",
  "difficultyLevel": "easy",
  "points": 1,
  "tags": ["Python", "أنواع البيانات", "type"],
  "explanation": "الدالة type تعرض نوع القيمة. العدد 10 من نوع int في Python.",
  "options": [
    { "optionText": "<class 'int'>", "isCorrect": true, "optionOrder": 1 },
    { "optionText": "<class 'str'>", "isCorrect": false, "optionOrder": 2 },
    { "optionText": "<class 'float'>", "isCorrect": false, "optionOrder": 3 },
    { "optionText": "error", "isCorrect": false, "optionOrder": 4 }
  ],
  "isActive": true
}
```

### Question Explanation Requirements

Every question should include a helpful explanation.

The explanation should:

- Explain why the correct answer is correct.
- Mention the tested concept.
- Be short and direct.
- Avoid long lectures.
- Avoid saying only "لأنها الإجابة الصحيحة".
- Avoid copying from official exams, books, or protected sources.

Good explanation:

> المتغير يستخدم لتخزين قيمة باسم محدد، حتى يمكن الرجوع إليها واستخدامها لاحقًا داخل البرنامج.

Weak explanation:

> هذه هي الإجابة الصحيحة.

### Difficulty Distribution For Better Guidance

Use difficulty levels carefully:

- `easy`: checks basic recognition or simple use.
- `medium`: checks understanding or applying one concept.
- `hard`: checks deeper application, combined concepts, or debugging.

Recommended distribution for a 20-question beginner quiz:

| difficultyLevel | العدد التقريبي |
|---|---:|
| easy | 7 |
| medium | 10 |
| hard | 3 |

This helps the result page tell the student if mistakes are concentrated in basic or advanced questions.

### Study Summaries And Result Guidance

Study summaries are optional, but they improve result guidance significantly.

If a chapter has a published StudySummary, the result page can suggest it when the student makes mistakes in that chapter.

Recommended StudySummary table:

| الحقل | القيمة | ملاحظة الإدخال إن وجدت |
|---|---|---|
| subjectSlug | python | للمساعدة في الربط اليدوي |
| chapterSlug / chapterName | المتغيرات وأنواع البيانات | اربطه بالفصل الصحيح في لوحة الإدارة |
| title | ملخص المتغيرات وأنواع البيانات في Python | عنوان واضح |
| slug | python-variables-data-types-summary | slug إنجليزي واضح |
| excerpt | شرح مختصر للمتغيرات، النصوص، الأرقام، والتحويل بين أنواع البيانات في Python. | يظهر في البطاقات |
| contentHtml | محتوى HTML منظم | اختياري |
| contentText | نص مبسط | اختياري |
| pdfAttachmentId | يترك فارغًا إذا لا يوجد PDF | اختياري |
| status | published أو draft | لا تنشر إلا إذا كان المحتوى جاهزًا |
| accessType | inherit / free / paid | حسب سياسة الوصول |

Important:

- A summary can be linked to the whole subject only.
- A summary can also be linked to a specific chapter.
- For better result guidance, link summaries to chapters whenever possible.
- If a course has no summaries, the result page still works and will guide the student to review wrong questions and explanations.

### PDF Page Numbers

The current platform does not automatically know page numbers inside a PDF.

If the owner wants the AI assistant to prepare PDF-related guidance, write it as editorial notes only, not as a guaranteed platform field.

Example optional editorial note:

| الحقل | القيمة | ملاحظة |
|---|---|---|
| reviewHint | راجع قسم المتغيرات في الصفحات 3-5 من ملف PDF إن كان مطابقًا للنسخة النهائية. | ملاحظة تحريرية فقط |

Do not claim page numbers unless the final PDF is known and stable.

### When Summaries Are Not Required

Some academy, school, or training quizzes may not need summaries.

Examples:

- Diagnostic quizzes.
- Practice-only quizzes.
- School ministry-style model quizzes.
- Short review quizzes.

In these cases:

- Keep questions clear.
- Add good explanations.
- Add useful tags.
- Do not force a StudySummary if there is no real content to add.

The result page should still provide useful guidance from wrong questions, tags, chapters, and explanations.

### Recommended AI Output For A Complete Testable Unit

When asking an AI tool to create content for a training unit, prefer this output order:

1. Subject table.
2. Chapters table.
3. StudySummary table for each important chapter, if needed.
4. Quiz table.
5. Questions JSON only.
6. SEO table.
7. Quality notes.
8. Checklist before entry.

Do not put everything in one huge JSON object unless specifically requested.

### Prompt Example For AI Tools

Use a prompt like this when generating a unit:

```text
أنشئ وحدة تدريبية لمادة Python داخل المسارات التدريبية في مستواك.

المطلوب:
- Subject Table مختصر.
- Chapters Table بعدد 4 فصول واضحة.
- StudySummary Table لفصلين مهمين فقط.
- Quiz Table لاختبار تدريبي واحد.
- Questions JSON يحتوي 20 سؤال اختيار من متعدد.

مهم:
- اربط كل سؤال بفصل واضح.
- أضف 2 إلى 4 tags لكل سؤال.
- أضف explanation مختصر لكل سؤال.
- وزع الصعوبة بين easy و medium و hard.
- لا تدّعِ أن الاختبار رسمي أو معتمد.
- لا تضف "| مستواك" داخل metaTitle.
- اجعل المخرجات مناسبة للإدخال اليدوي في لوحة الإدارة.
```

### Checklist For Result Guidance Readiness

Before entering academy quiz content, verify:

- هل كل سؤال مرتبط بفصل واضح؟
- هل أسماء الفصول دقيقة وليست عامة جدًا؟
- هل لكل سؤال explanation مفيد؟
- هل لكل سؤال tags مناسبة ومتناسقة؟
- هل difficultyLevel منطقي؟
- هل يوجد ملخص منشور للفصول المهمة إن كان ذلك مناسبًا؟
- هل الملخص مرتبط بنفس الفصل الذي تختبره الأسئلة؟
- هل المحتوى يعمل حتى لو لم توجد ملخصات؟
- هل الأسئلة أصلية وغير منسوخة؟
- هل لا توجد ادعاءات رسمية أو اعتماد غير صحيح؟
- هل SEO لا يحتوي تكرار "مستواك"؟

### Important Content Principle

The result guidance feature is only as good as the structure of the content.

For useful student guidance:

- Chapter = where the student struggled.
- Tags = what exact concept needs review.
- Explanation = why the answer is correct.
- StudySummary = where the student can study next.

This should guide how academy content is generated from now on.

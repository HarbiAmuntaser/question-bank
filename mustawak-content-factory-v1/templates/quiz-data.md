# Quiz Generator Data

| الحقل | القيمة |
| --- | --- |
| title | `{{QUIZ_TITLE}}` |
| selectedChapters | `SELECT_IN_ADMIN` |
| questionCount | `{{INTEGER_1_TO_100}}` |
| timeLimit | `{{INTEGER_1_TO_180}}` |
| difficulty | `mixed` |
| questionTypes | `multiple_choice`, `true_false` |
| randomize | `true` |
| accessType | `inherit` |
| isFreePreview | `false` |

## تحقق قبل الإنشاء

- الأسئلة المعتمدة مستوردة إلى Chapters الصحيحة.
- العدد لا يتجاوز الأسئلة الفعالة المتاحة.
- Quiz التجميعي يمكن أن يختار عدة Chapters؛ مراجع المراجعة تبقى على كل Question.
- لا تجعل الاختبار مجانيًا أو مدفوعًا صراحة دون قرار منتج.


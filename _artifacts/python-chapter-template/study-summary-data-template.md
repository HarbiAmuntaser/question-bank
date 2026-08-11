# StudySummary Data Template

ابدأ الملخص دائمًا كمسودة، ثم انشره فقط بعد المعاينة والتحقق.

| الحقل | القيمة | ملاحظة الإدخال |
| --- | --- | --- |
| subject | `{{SUBJECT_NAME_OR_ID}}` | اختر مادة Python التي يتبع لها الملخص. |
| chapter | `{{CHAPTER_NAME_OR_ID}}` | اختر الفصل الذي يغطيه الملخص. |
| title | `{{SUMMARY_TITLE}}` | عنوان عربي واضح دون إضافة `\| مستواك`. |
| slug | `{{SUMMARY_SLUG}}` | slug إنجليزي قصير وواضح. |
| excerpt | `{{SUMMARY_EXCERPT}}` | وصف موجز ودقيق لمحتوى الملخص. |
| contentHtml | محتوى `study-summary-template.html` بعد استبدال placeholders | لا تضع `h1` أو CSS أو scripts داخل المحتوى. |
| status | `draft` | لا تحوله إلى `published` قبل اعتماد المحتوى. |
| language | `ar` | لغة الواجهة والمحتوى الحالية. |
| accessType | `inherit` | يرث سياسة الوصول من المادة ما لم يعتمد قرار آخر. |
| sortOrder | `{{SORT_ORDER}}` | ترتيب الملخص داخل المادة. |
| isFeatured | `false` | يغير فقط بقرار تحريري واضح. |

يمكن ترك `contentText` فارغًا؛ يستطيع النظام توليده من `contentHtml`.

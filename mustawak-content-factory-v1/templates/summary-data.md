# StudySummary Data

| الحقل | القيمة |
| --- | --- |
| Subject | `SELECT_IN_ADMIN` |
| Chapter | `SELECT_IN_ADMIN` |
| title | `{{SUMMARY_TITLE}}` |
| slug | `{{SUMMARY_SLUG}}` |
| excerpt | `{{SUMMARY_EXCERPT_OR_EMPTY}}` |
| summaryMode | `print_attachment` — محلي فقط، ليس حقل DB |
| contentHtml | فارغ في `print_attachment`؛ محتوى `summary-platform.html` في `platform_html` |
| contentText | `{{CONTENT_TEXT_OR_EMPTY}}` |
| pdfAttachmentId | `SELECT_AFTER_PDF_UPLOAD` أو فارغ |
| status | `draft` |
| accessType | `inherit` |
| publishedAt | فارغ |
| language | `ar` أو `en` فقط |
| readingMinutes | `{{POSITIVE_INTEGER_OR_EMPTY}}` |
| sortOrder | `0` |
| isFeatured | `false` |

في نمط `print_attachment` أنشئ السجل بعد رفع PDF أو أضف `contentText` مؤقتًا، لأن الإنشاء يتطلب محتوى HTML أو نصًا أو pdfAttachmentId واحدًا على الأقل.


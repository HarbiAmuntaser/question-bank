# Chapter Production Package

## 1. Identity

| الحقل | القيمة |
| --- | --- |
| Subject | `{{SUBJECT}}` |
| Chapter local ID | `{{CHAPTER_LOCAL_ID}}` |
| Package version | `{{VERSION}}` |
| Summary mode | `{{print_attachment_or_platform_html}}` |
| Source IDs | `{{SOURCE_IDS}}` |

## 2. Chapter fields

استخدم `chapter-data.md`، ثم اعرض القيم النهائية في جدول قابل للنسخ.

## 3. StudySummary fields

استخدم `summary-data.md`. ضع HTML في ملف وكتلة مستقلة، ولا تخلط HTML المطبوع مع contentHtml.

## 4. Questions import

- File: `questions.import.json`
- Admin selects Chapter: `{{CHAPTER_NAME}}`
- Admin selects review Summary once: `{{SUMMARY_NAME_OR_NONE}}`
- Duplicate strategy: `{{fail_or_skip}}`
- Expected records: `{{COUNT}}`

## 5. Quiz fields

استخدم `quiz-data.md` وسجل Expected Question Count.

## 6. SEO records

أنشئ ملفًا منفصلًا لكل owner. اختر owner وlocale وslug في الإدارة، ثم استورد محتوى `seo-import.json` بعد استبدال القيم.

## 7. Question source map

| localQuestionId | sourceId | location | objective | style | answer evidence |
| --- | --- | --- | --- | --- | --- |
| `CH01-Q001` | `SRC-001` | `p. 1` | `{{OBJECTIVE}}` | `direct_concept` | `{{EVIDENCE}}` |

## 8. Coverage and omissions

| source range | covered in | omitted? | reason |
| --- | --- | --- | --- |
| `{{RANGE}}` | `{{SECTION_OR_QUESTION}}` | `no` | — |

## 9. QA result

| Gate | Result | Notes |
| --- | --- | --- |
| Sources | `PENDING` | |
| Academic fidelity | `PENDING` | |
| Questions | `PENDING` | |
| Technical/import | `PENDING` | |
| A4/platform HTML | `PENDING` | |
| SEO | `PENDING` | |

## 10. Manual Admin order

1. Create/update Chapter as inactive during verification.
2. Create StudySummary as draft.
3. Convert print HTML to PDF if applicable, upload, and link it.
4. Recheck final PDF pages; then finalize reviewPage values.
5. Import questions and reconcile imported/skipped counts.
6. Create Quiz from approved questions.
7. Select SEO owner/locale/slug and import each SEO record.
8. Preview protected/public behavior, then request publishing approval.

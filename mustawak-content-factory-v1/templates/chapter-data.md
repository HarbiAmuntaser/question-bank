# Chapter Data

انسخ القيم بعد استبدال placeholders. اختيار Subject يتم من لوحة الإدارة.

| الحقل | القيمة |
| --- | --- |
| Subject | `SELECT_IN_ADMIN` |
| name | `{{CHAPTER_NAME}}` |
| slug | `{{CHAPTER_SLUG_OR_EMPTY}}` |
| chapterNumber | `{{CHAPTER_NUMBER_OR_EMPTY}}` |
| description | `{{CHAPTER_DESCRIPTION_OR_EMPTY}}` |
| learningObjectives | `{{ONE_OBJECTIVE_PER_LINE}}` |
| kind | `theory` |
| isActive | `false` |

## Source coverage

| الهدف | sourceId | الموضع | حالة التغطية |
| --- | --- | --- | --- |
| `{{OBJECTIVE}}` | `SRC-001` | `p. 1-3` | `covered` |


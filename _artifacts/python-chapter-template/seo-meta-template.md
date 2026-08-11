# SeoMeta Template

لا تضف `| مستواك` إلى `metaTitle`؛ يمكن للنظام إضافة اسم الموقع تلقائيًا.

## StudySummary SeoMeta

| الحقل | القيمة | ملاحظة الإدخال |
| --- | --- | --- |
| ownerType | `study_summary` | قيمة ثابتة لصفحة الملخص. |
| ownerId | `{{STUDY_SUMMARY_ID}}` | المعرّف الحقيقي بعد إنشاء الملخص. |
| slug | `{{SUMMARY_SLUG}}` | يطابق slug الخاص بـStudySummary. |
| locale | `ar` | اللغة الحالية. |
| metaTitle | `{{SUMMARY_META_TITLE}}` | عنوان موجز بلا تكرار لاسم الموقع. |
| metaDescription | `{{SUMMARY_META_DESCRIPTION}}` | وصف دقيق لمحتوى الصفحة. |
| ogTitle | `{{SUMMARY_OG_TITLE}}` | عنوان مخصص للمشاركة الاجتماعية. لا يلزم أن يطابق `metaTitle` حرفيًا، لكن يجب أن يحافظ على نية الصفحة نفسها. |
| ogDescription | `{{SUMMARY_OG_DESCRIPTION}}` | وصف موجز مناسب للمشاركة الاجتماعية. لا يلزم أن يطابق `metaDescription` حرفيًا، لكن يجب أن يحافظ على نية الصفحة نفسها. |
| noindex | `true` | يبقى مفعّلًا أثناء الإنتاج والتجربة. |
| nofollow | `false` | لا يغيّر إلا بقرار SEO واضح. |
| canonicalUrl | `{{SUMMARY_CANONICAL_URL_OR_NULL}}` | يبقى `null` أثناء الإنتاج، ثم يستخدم المسار الرسمي على `mustawak.com` بعد اعتماد الرابط النهائي. |
| schemaJson | `{{SUMMARY_SCHEMA_JSON_OR_NULL}}` | استخدم JSON صالحًا فقط، وإلا `null`. |

## Quiz SeoMeta

| الحقل | القيمة | ملاحظة الإدخال |
| --- | --- | --- |
| ownerType | `exam` | هذا هو ownerType المستخدم حاليًا للاختبار في SeoMeta. |
| ownerId | `{{QUIZ_ID}}` | المعرّف الحقيقي بعد إنشاء الاختبار. |
| slug | `{{QUIZ_SLUG}}` | slug الرسمي للاختبار. |
| locale | `ar` | اللغة الحالية. |
| metaTitle | `{{QUIZ_META_TITLE}}` | عنوان موجز بلا تكرار لاسم الموقع. |
| metaDescription | `{{QUIZ_META_DESCRIPTION}}` | يصف الاختبار التدريبي ونطاقه بدقة. |
| ogTitle | `{{QUIZ_OG_TITLE}}` | عنوان مخصص للمشاركة الاجتماعية. لا يلزم أن يطابق `metaTitle` حرفيًا، لكن يجب أن يحافظ على نية الصفحة نفسها. |
| ogDescription | `{{QUIZ_OG_DESCRIPTION}}` | وصف موجز مناسب للمشاركة الاجتماعية. لا يلزم أن يطابق `metaDescription` حرفيًا، لكن يجب أن يحافظ على نية الصفحة نفسها. |
| noindex | `true` | يبقى مفعّلًا أثناء الإنتاج والتجربة. |
| nofollow | `false` | لا يغيّر إلا بقرار SEO واضح. |
| canonicalUrl | `{{QUIZ_CANONICAL_URL_OR_NULL}}` | يبقى `null` أثناء الإنتاج، ثم يستخدم المسار الرسمي على `mustawak.com` بعد اعتماد الرابط النهائي. |
| schemaJson | `{{QUIZ_SCHEMA_JSON_OR_NULL}}` | استخدم JSON صالحًا فقط، وإلا `null`. |

## Planning Notes

هذه ملاحظات تحريرية فقط وليست حقولًا في payload الخاص بـSeoMeta:

| البند | القيمة التخطيطية |
| --- | --- |
| Primary Keyword | `{{PRIMARY_KEYWORD}}` |
| Secondary Keywords | `{{SECONDARY_KEYWORDS}}` |
| Search Intent | `{{SEARCH_INTENT}}` |
| canonicalStatus | `{{CANONICAL_STATUS_NOTE}}` |

لا ترسل حقول Planning Notes إلى API أو قاعدة البيانات.

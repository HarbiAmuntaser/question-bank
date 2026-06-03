# Cache Audit Report

Generated on: 2026-06-02

Scope: this report documents the current caching behavior in the Next.js 15 App Router project. It covers student/public pages, admin pages, API route handlers, cache tags, TTL values, and invalidation paths. No application logic is changed by this document.

## Executive Summary

The project currently uses a mixed caching strategy:

- Public/student content is mostly cached through `unstable_cache` inside `/api/v1/student/**` route handlers, plus CDN-oriented `Cache-Control: public, s-maxage=...` headers.
- Public route pages also define ISR-like `export const revalidate` values in several places.
- Private student flows such as quiz runtime, grading, results, review, subscription status, code redemption, and payment requests are correctly marked `private, no-store`.
- Admin API responses are generally protected from shared caching with `private, no-store`, while some admin data is cached internally with `unstable_cache` and invalidated by tags.
- Content mutation endpoints invalidate the main public/admin tags through `src/lib/cache-invalidation.ts`.
- There are still a few consistency gaps: some public endpoints use only `Cache-Control` without `unstable_cache` tags, some old literal tags still exist beside namespaced tags, and a few component-level `export const revalidate` exports do not affect route caching.

## Core Cache Files

| File | Purpose | Notes |
| --- | --- | --- |
| `src/lib/cache-tags.ts` | Central TTL constants, `Cache-Control` helpers, and namespaced cache tags. | Main place to adjust standard TTL values. |
| `src/lib/cache-invalidation.ts` | Central invalidation helpers for universities, majors, subjects, chapters, questions, quizzes, and SEO. | Main place to review tag coverage after mutations. |
| `src/lib/cache.ts` | Wrapper around `unstable_cache` + React `cache`. | Generic helper, currently not the primary style used by most routes. |
| `src/lib/server/student-fetch.ts` | Server-side public fetch helper using same-origin request origin and `next.revalidate`. | Public pages call APIs through this helper. |
| `src/lib/student-client.ts` | Client-side fetch helper. | Client components cannot use `next.revalidate`; they rely on route handler `Cache-Control`. |
| `src/lib/admin/dashboard.ts` | Cached admin dashboard data. | Uses `unstable_cache` with a 300 second TTL and the `dashboard` tag. |

## TTL and Header Constants

Main values live in `src/lib/cache-tags.ts`.

| Constant | Value | Intended Use |
| --- | ---: | --- |
| `CACHE_TTL.publicShort` | 300 seconds | Short public cache windows. |
| `CACHE_TTL.publicMedium` | 600 seconds | Home previews and moderately fresh public content. |
| `CACHE_TTL.publicStable` | 3600 seconds | Stable public lists and most public data. |
| `CACHE_TTL.publicLong` | 21600 seconds | Stable public detail/SEO data. |
| `CACHE_TTL.adminList` | 60 seconds | Intended for admin lists, but many current admin list caches still use literal `3600`. |
| `CACHE_TTL.adminDashboard` | 300 seconds | Intended admin dashboard TTL. |
| `CACHE_TTL.adminAnalytics` | 86400 seconds | Intended daily analytics TTL, not currently used for live admin analytics endpoints. |
| `CACHE_CONTROL.PRIVATE_NO_STORE` | `private, no-store, no-cache, max-age=0, must-revalidate` | Admin/private/user-specific endpoints. |
| `CACHE_CONTROL.publicSMaxage(seconds, staleWhileRevalidate)` | `public, s-maxage=..., stale-while-revalidate=...` | CDN-friendly public route handler responses. |

Additional literal TTL values currently exist in route/page files:

| Value | Location | Notes |
| ---: | --- | --- |
| 3600 | `src/app/page.tsx` | Root landing page ISR setting. |
| 3600 | `src/app/[cc]/[type]/page.tsx` | Institution listing route ISR setting. |
| 3600 | `src/app/quizzes/page.tsx` | Public quiz listing ISR/fetch setting. |
| 21600 | `src/app/[cc]/[type]/universities/[...slug]/page.tsx` | Public detail route ISR setting. |
| 21600 | `src/app/[cc]/[type]/majors/[...slug]/page.tsx` | Public compatibility/detail route ISR setting. |
| 21600 | `src/app/[cc]/[type]/subjects/[...slug]/page.tsx` | Public compatibility/detail route ISR setting. |
| 21600 | `src/components/public/major-details.tsx` | Component-level export; does not control route caching. |
| 21600 | `src/components/public/subject-details.tsx` | Component-level export; does not control route caching. |
| 21600 | `src/components/public/quiz-details.tsx` | Component-level export; does not control route caching. |
| 300 | `src/lib/admin/dashboard.ts` | `DASHBOARD_REVALIDATE_SECONDS`. |
| 300 | `src/app/admin/page.tsx` | Server fetch to dashboard API uses `next.revalidate: 300`. |
| 3600 | Many `/api/v1/admin/**` list `unstable_cache` wrappers | Admin list data cache; responses remain `private, no-store`. |

## Cache Tags

Main tag definitions live in `src/lib/cache-tags.ts`.

### Admin Tags

| Tag | Meaning |
| --- | --- |
| `admin:analytics` | Admin analytics data. |
| `admin:attachments` | Admin exam attachment data. |
| `admin:chapters` | Admin chapter data. |
| `admin:dashboard` | Admin dashboard data. |
| `admin:exams` | Admin exam data. |
| `admin:majors` | Admin major data. |
| `admin:questions` | Admin question data. |
| `admin:quizzes` | Admin quiz data. |
| `admin:seo` | Admin SEO metadata. |
| `admin:subjects` | Admin subject data. |
| `admin:universities` | Admin institution/university data. |
| `admin:users` | Admin user data. |

### Public Tags

| Tag | Meaning |
| --- | --- |
| `public:institutions` | All public institution lists/details. |
| `public:institutions:country:{CC}` | Institution data for one country. |
| `public:institution:{id}` | One institution detail. |
| `public:majors` | All public major/program data. |
| `public:majors:university:{id}` | Majors under one institution. |
| `public:major:{id}` | One major detail. |
| `public:subjects` | All public subject data. |
| `public:subjects:major:{id}` | Subjects under one major. |
| `public:subject:{id}` | One subject detail. |
| `public:quizzes` | All public quiz previews/lists. |
| `public:quizzes:subject:{id}` | Quizzes under one subject. |
| `public:quiz:{id}` | One public quiz preview/detail. |
| `public:seo` | Public SEO metadata. |
| `public:seo:{ownerType}:{ownerId}` | SEO metadata for one owner. |
| `public:stats` | Public platform statistics. |

### Legacy Literal Tags Still in Use

The invalidation layer also uses older literal tags. These are kept for compatibility with existing cached functions.

| Legacy Tag | Current Use |
| --- | --- |
| `universities` | Admin and old university caches. |
| `majors` | Admin and old major caches. |
| `subjects` | Admin and old subject caches. |
| `chapters` | Admin and old chapter caches. |
| `questions` | Admin and old question caches. |
| `quizzes` | Admin and old quiz caches. |
| `exams` | Exam-related admin caches. |
| `users` | Admin users cache. |
| `seo-meta` | Admin SEO metadata cache. |
| `dashboard` | Admin dashboard cache. |
| `student-universities` | Public student university route caches. |
| `student-university-detail` | Public student university detail caches. |
| `student-majors` | Public student major route caches. |
| `student-major-detail` | Public student major detail caches. |
| `student-subjects` | Public student subject route caches. |
| `student-subject-detail` | Public student subject detail caches. |
| `student-quizzes` | Public student quiz route caches. |
| `student-quiz-preview` | Public student quiz preview route caches. |
| `student-quizzes-by-subject` | Public student quiz-by-subject route caches. |
| `student-stats` | Public platform stats route cache. |

## Student/Public Pages Cache Matrix

| UI / Page | Files | Cache Type | TTL Source | Data Source / Call Site | Invalidation | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| Root page | `src/app/page.tsx` | Route ISR export. | Literal `revalidate = 3600`. | Static/root public page. | No explicit tag invalidation found. | Public, stable page shell. |
| Country home | `src/app/[cc]/page.tsx` | Server fetches with `next.revalidate`; API responses have public CDN headers. | `fetchJSON(..., 600)`. | `/api/v1/student/universities`, `/api/v1/student/stats`. | University/major/subject/quiz invalidation hits public content and stats tags; page shell itself is not directly tag-bound. | Home content should be reasonably fresh but not personalized. |
| Institution listing | `src/app/[cc]/[type]/page.tsx` | Route ISR plus server fetches. | Route `revalidate = 3600`; initial API fetch uses `600`. | `/api/v1/student/universities?limit=200...`. | `revalidateUniversityCache` invalidates institution tags; page HTML relies on route/fetch behavior. | Public listing, stable enough for medium TTL. |
| Institution detail / hierarchy | `src/app/[cc]/[type]/universities/[...slug]/page.tsx` | Route ISR plus public API fetches. | Route `revalidate = 21600`; fetch calls use `21600`. | Student university/major/subject/quiz detail APIs. | University/major/subject/question/quiz invalidation covers public detail tags. | Detail pages are mostly stable and SEO-oriented. |
| Major compatibility/detail route | `src/app/[cc]/[type]/majors/[...slug]/page.tsx` | Route ISR plus public API fetches. | Route `revalidate = 21600`; fetch calls use `21600`. | `/api/v1/student/majors/by-slug`, by-code, by-id. | Major/subject/quiz invalidation covers public major/subject/quiz tags. | Stable detail route. |
| Subject compatibility/detail route | `src/app/[cc]/[type]/subjects/[...slug]/page.tsx` | Route ISR plus public API fetches. | Route `revalidate = 21600`; fetch calls use `21600`. | `/api/v1/student/subjects/by-slug`, by-code, by-id. | Subject/question/quiz invalidation covers public subject/quiz tags. | Stable detail route. |
| Public quiz listing | `src/app/quizzes/page.tsx` | Route ISR plus fetch `next.revalidate`. | Route `revalidate = 3600`; fetch helper defaults `next.revalidate = 3600`. | `/api/v1/student/quizzes`, select endpoints. | Quiz/subject/major/university mutations invalidate several quiz tags, but the main `/api/v1/student/quizzes` route itself currently has only CDN headers and no `unstable_cache` tag binding found. | Public listing, not user-specific. |
| Quiz runtime | `src/app/quiz/[id]/page.tsx` | Forced dynamic/no-store. | `dynamic = "force-dynamic"`, `revalidate = 0`, fetch `cache: "no-store"`. | `/api/v1/student/quizzes/by-id/[id]`. | No cache to invalidate. | User/session-specific access and runtime data. |
| Quiz results | `src/app/quiz/[id]/results/page.tsx` | Forced dynamic/no-store. | `dynamic = "force-dynamic"`, `revalidate = 0`, fetch `cache: "no-store"`. | Results/private quiz APIs. | No cache to invalidate. | User/session-specific results. |
| Quiz review | `src/app/quiz/[id]/review/page.tsx` | Forced dynamic/no-store. | `dynamic = "force-dynamic"`, `revalidate = 0`, fetch `cache: "no-store"`. | Review/private quiz APIs. | No cache to invalidate. | User/session-specific review. |
| Dashboard | `src/app/dashboard/page.tsx` if present/used | No explicit cache config found in this audit. | N/A. | Client/local or page-level behavior. | N/A. | Should stay private if it becomes user-specific. |

## Student/Public API Cache Matrix

| API Route | Cache Type | TTL / Header | Tags | Invalidated By | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/student/universities` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicStable` / `publicSMaxage(3600)`. | `student-universities`, `public:institutions`, `public:institutions:country:{CC}`. | `revalidateUniversityCache`, also broad major/subject/quiz invalidations include related public tags. | Main public institution list. |
| `GET /api/v1/student/universities/[id]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong` / `publicSMaxage(21600)`. | `student-universities`, `student-university-detail`, `public:institutions`, `public:institution:{id}`. | `revalidateUniversityCache`. | Stable public institution detail. |
| `GET /api/v1/student/universities/by-slug/[...slug]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong`. | Student university/detail and public institution tags. | `revalidateUniversityCache`, `revalidateSeoCache` for university SEO. | SEO-friendly resolver/detail endpoint. |
| `GET /api/v1/student/universities/by-code/[code]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong`. | Student university/detail tags. | `revalidateUniversityCache`. | Code fallback resolver. |
| `GET /api/v1/student/universities/select` | Public CDN header only. | `CACHE_TTL.publicStable`. | No `unstable_cache` tags found. | TTL only unless route is changed later. | Lightweight select data for public filters. |
| `GET /api/v1/student/majors` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicStable`. | `student-majors`, `public:majors`, `public:majors:university:{id}`. | `revalidateMajorCache`, `revalidateUniversityCache`. | Public majors/programs list. |
| `GET /api/v1/student/majors/[by-id/by-code/by-slug]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong`. | `student-majors`, `student-major-detail`, `public:majors`, `public:major:{id}`. | `revalidateMajorCache`, `revalidateSeoCache` for major SEO. | Stable major detail/resolver endpoints. |
| `GET /api/v1/student/majors/select` | Public CDN header only. | `CACHE_TTL.publicStable`. | No `unstable_cache` tags found. | TTL only unless route is changed later. | Public filter/select data. |
| `GET /api/v1/student/subjects` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicStable`. | `student-subjects`, `public:subjects`, `public:subjects:major:{id}`. | `revalidateSubjectCache`, `revalidateMajorCache`. | Public subjects list. |
| `GET /api/v1/student/subjects/[by-id/by-code/by-slug]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong`. | `student-subjects`, `student-subject-detail`, `public:subjects`, `public:subject:{id}`. | `revalidateSubjectCache`, `revalidateSeoCache` for subject SEO. | Stable subject detail/resolver endpoints. |
| `GET /api/v1/student/subjects/select` | Public CDN header only. | `CACHE_TTL.publicStable`. | No `unstable_cache` tags found. | TTL only unless route is changed later. | Public filter/select data. |
| `GET /api/v1/student/quizzes` | Public CDN header only. | `CACHE_TTL.publicStable`. | No `unstable_cache` tags found in the route. | TTL only for this exact route response; broader quiz tags do not bind to this route unless wrapped later. | Important watch item because public quiz list should update after admin quiz changes. |
| `GET /api/v1/student/quizzes/by-subject/[id]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicStable`. | `student-quizzes`, `student-quizzes-by-subject`, `public:quizzes`, `public:quizzes:subject:{id}`. | `revalidateQuizCache`, `revalidateQuestionCache`, `revalidateSubjectCache`. | Public subject quiz list. |
| `GET /api/v1/student/quizzes/preview/by-id/[id]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong`. | `student-quizzes`, `student-quiz-preview`, `public:quizzes`, `public:quiz:{id}`. | `revalidateQuizCache`, `revalidateQuestionCache`, `revalidateSeoCache` for exam/quiz SEO. | Public quiz preview/detail; not runtime. |
| `GET /api/v1/student/quizzes/preview/by-slug/[...slug]` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicLong`. | Student quiz preview and public quiz tags. | `revalidateQuizCache`, `revalidateSeoCache`. | Slug resolver/preview. |
| `GET /api/v1/student/quizzes/by-id/[id]` | Private no-store. | `CACHE_CONTROL.PRIVATE_NO_STORE`. | None. | No cache. | Enforces subscription/access server-side for quiz runtime. |
| `GET /api/v1/student/quizzes/by-id-context/[id]` | Private no-store. | `CACHE_CONTROL.PRIVATE_NO_STORE`. | None. | No cache. | User/session-specific quiz context/access. |
| `POST /api/v1/student/quizzes/grade` | Private no-store. | `CACHE_CONTROL.PRIVATE_NO_STORE`. | None. | No cache. | Saves attempts/answers and returns current response shape. |
| `GET /api/v1/student/access/status` | Private no-store. | `CACHE_CONTROL.PRIVATE_NO_STORE`. | None. | No cache. | AnonymousSession/access-status specific. |
| `POST /api/v1/student/access/redeem` | Private no-store. | `CACHE_CONTROL.PRIVATE_NO_STORE`. | None. | No cache. | Subscription code redemption. |
| `POST /api/v1/student/access/payment-request` | Private no-store. | `CACHE_CONTROL.PRIVATE_NO_STORE`. | None. | No cache. | Manual subscription contact/request flow. |
| `GET /api/v1/student/stats` | `unstable_cache` + public CDN header. | `CACHE_TTL.publicStable`. | `student-stats`, `public:stats`. | Content invalidation helpers include `public:stats` and `student-stats`. | Public platform stats, only real available counts should be shown. |
| `GET /api/v1/student/seo/[university/major/subject/quiz]` | Public CDN header. | `CACHE_TTL.publicLong`. | No `unstable_cache` tag binding found in this audit. | `revalidateSeoCache` invalidates SEO tags, but these endpoints appear to rely on TTL/CDN header unless changed. | Watch item if instant SEO changes are required. |

## Admin Pages Cache Matrix

| Admin UI | Files | Cache Behavior | Data Source | Invalidation / Refresh | Reason |
| --- | --- | --- | --- | --- | --- |
| Admin dashboard | `src/app/admin/page.tsx`, `src/lib/admin/dashboard.ts`, `src/app/api/v1/admin/dashboard/route.ts` | Page fetch uses `next.revalidate: 300`; route response is `private, no-store`; underlying dashboard data uses `unstable_cache` for 300 seconds with tag `dashboard`. | `/api/v1/admin/dashboard` -> `getDashboardDataCached()`. | Admin mutations generally do not invalidate `dashboard` except where literal `dashboard` is used elsewhere; data naturally refreshes within 300 seconds. | Dashboard should be quick but not shared through CDN. |
| Admin analytics | `src/app/admin/analytics/page.tsx`, `src/app/api/v1/admin/analytics/route.ts` | Explicit `cache: "no-store"` and `private, no-store`. | `/api/v1/admin/analytics?days=...`. | No cache. | Analytics should reflect current educational data and is admin-private. |
| Admin analytics export | `src/app/api/v1/admin/analytics/export/route.ts` | `private, no-store`. | Direct analytics export route. | No cache. | Download/export is admin-private. |
| Admin subscriptions | `src/app/admin/subscriptions/page.tsx`, `src/app/admin/subscriptions/actions.ts` | `dynamic = "force-dynamic"`; direct Prisma page data; no shared cache. | Direct Prisma queries. | `revalidatePath("/admin/subscriptions")` plus public major/subject/quiz tags after subscription mutations. | Subscription/admin access data should be fresh and private. |
| Admin quizzes list | `src/app/admin/quizzes/page.tsx`, `src/app/api/v1/admin/quizzes/route.ts` | Initial page data/direct or API-backed; admin API has `unstable_cache` list wrapper but response is `private, no-store`. | Prisma or `/api/v1/admin/quizzes`. | `revalidateQuizCache` on create/update/delete. | Admin-private, but list query can be cached internally. |
| Admin users list | `src/app/admin/users/page.tsx`, `src/app/api/v1/admin/users/route.ts` | Admin API uses `unstable_cache` tag `users`; response is `private, no-store`. | Prisma or `/api/v1/admin/users`. | `revalidateTag("users")` on create/update/delete. | Admin-private user management. |
| Admin SEO meta | `src/app/admin/seo-meta/page.tsx`, `src/app/api/v1/admin/seo-meta/route.ts`, `[id]/route.ts` | Response is `private, no-store`; mutations invalidate SEO tags. | Prisma/API. | `revalidateSeoCache`. | Admin-private SEO edits should invalidate public SEO/content caches. |
| Admin universities | `src/app/admin/universities/page.tsx`, `src/app/api/v1/admin/universities/route.ts`, `[id]/route.ts` | Admin API response is `private, no-store`; a cached list helper exists, but the route currently performs direct list queries in the observed code path. | Prisma/API. | `revalidateUniversityCache` on create/update/delete. | Institution changes affect public hierarchy and stats. |
| Admin majors | `src/app/admin/majors/page.tsx`, `src/app/api/v1/admin/majors/route.ts`, `[id]/route.ts` | Admin API uses `unstable_cache` list wrapper; response is `private, no-store`. | Prisma/API. | `revalidateMajorCache` on create/update/delete; some server actions also call `revalidatePath("/admin/majors")`. | Major changes affect public major/subject/quiz hierarchy. |
| Admin subjects | `src/app/admin/subjects/page.tsx`, `src/app/api/v1/admin/subjects/route.ts`, `[id]/route.ts` | Admin API uses `unstable_cache` list wrapper; response is `private, no-store`. | Prisma/API. | `revalidateSubjectCache`; actions also revalidate admin path. | Subject changes affect public subjects/quizzes. |
| Admin chapters | `src/app/admin/chapters/page.tsx`, `src/app/api/v1/admin/chapters/route.ts`, `[id]/route.ts` | Admin API uses `unstable_cache` list wrapper; response is `private, no-store`. | Prisma/API. | `revalidateChapterCache`; actions also revalidate admin path/tag. | Chapters affect question organization and public quiz context. |
| Admin questions | `src/app/admin/questions/page.tsx`, `src/app/api/v1/admin/questions/route.ts`, `[id]/route.ts`, `import/route.ts` | Admin API uses `unstable_cache` list wrapper; response is `private, no-store`. | Prisma/API. | `revalidateQuestionCache` on create/update/delete/import. | Question changes must invalidate quiz previews and stats. |
| Admin exams | `src/app/admin/exams/page.tsx`, `src/app/api/v1/admin/exams/route.ts`, `[id]/route.ts` | Admin API uses `unstable_cache` with literal `exams`; response is `private, no-store`. | Prisma/API. | `revalidateTag("exams")` on exam mutations. | Exam data is admin-private and should not be CDN cached. |
| Admin exam questions | `src/app/api/v1/admin/exam-questions/**` | Admin-private route handlers. | Prisma/API. | `revalidateTag("exams")`. | Exam question changes affect exam views. |
| Admin attachments | `src/app/api/v1/admin/attachments/**` | Admin-private route handlers. | Prisma/API. | `revalidateTag("exams")`. | Attachments are linked to exams. |
| Admin lookup/select endpoints | `src/app/api/v1/admin/universities/select/route.ts`, `countries/route.ts`, lookup actions | API responses are `private, no-store`; select endpoint has internal `unstable_cache`. | Prisma/API. | Usually invalidated by related entity tags or TTL. | Admin-only lookup data, not shared. |

## Admin API Security Cache Policy

Admin APIs under `src/app/api/v1/admin/**` are expected to be:

- Authenticated with the existing admin verification/session pattern.
- Returned with `CACHE_CONTROL.PRIVATE_NO_STORE`.
- Never served with `Cache-Control: public`.

Observed examples:

- `src/app/api/v1/admin/dashboard/route.ts` uses `PRIVATE_NO_STORE`.
- `src/app/api/v1/admin/analytics/route.ts` and `analytics/export/route.ts` use `PRIVATE_NO_STORE`.
- Admin list/detail routes for universities, majors, subjects, chapters, questions, quizzes, users, SEO, and exams use `PRIVATE_NO_STORE` responses.

## Invalidation Matrix

| Mutation Area | Main Files | Invalidation Function / Tags | Public Caches Affected | Admin Caches Affected |
| --- | --- | --- | --- | --- |
| University create/update/delete | `src/app/api/v1/admin/universities/route.ts`, `[id]/route.ts` | `revalidateUniversityCache({ id, countryCode })` | Institutions, country institutions, one institution, majors, subjects, quizzes, SEO, stats. | `admin:universities`, legacy `universities`. |
| Major create/update/delete | `src/app/api/v1/admin/majors/route.ts`, `[id]/route.ts` | `revalidateMajorCache({ id, universityId })` | Majors, one major, majors by university, institutions, subjects, quizzes, SEO, stats. | `admin:majors`, legacy `majors`. |
| Subject create/update/delete | `src/app/api/v1/admin/subjects/route.ts`, `[id]/route.ts` | `revalidateSubjectCache({ id, majorId })` | Subjects, one subject, subjects by major, quizzes by subject, majors, institutions, quizzes, SEO, stats. | `admin:subjects`, legacy `subjects`. |
| Chapter create/update/delete | `src/app/api/v1/admin/chapters/route.ts`, `[id]/route.ts` | `revalidateChapterCache({ subjectId })` | Subject detail, quizzes, quizzes by subject, stats. | `admin:chapters`, legacy `chapters`. |
| Question create/update/delete/import | `src/app/api/v1/admin/questions/route.ts`, `[id]/route.ts`, `import/route.ts` | `revalidateQuestionCache({ subjectId })` | Quiz previews, quizzes by subject, subject detail, stats. | `admin:questions`, legacy `questions`. |
| Quiz create/update/delete | `src/app/api/v1/admin/quizzes/route.ts`, `[id]/route.ts` | `revalidateQuizCache({ id, subjectId })` | Quizzes, one quiz, quizzes by subject, subjects, SEO, stats. | `admin:quizzes`, legacy `quizzes`. |
| SEO create/update/delete | `src/app/api/v1/admin/seo-meta/route.ts`, `[id]/route.ts` | `revalidateSeoCache({ ownerType, ownerId })` | Public SEO tag, owner-specific SEO tag, related university/major/subject/quiz public tags. | `admin:seo`, legacy `seo-meta`. |
| Users create/update/delete | `src/app/api/v1/admin/users/route.ts`, `[id]/route.ts` | `revalidateTag("users")` | None. | Admin users list. |
| Exams / exam questions / attachments | `src/app/api/v1/admin/exams/**`, `exam-questions/**`, `attachments/**` | `revalidateTag("exams")` | No student/public exam cache observed in this audit. | Admin exams cache. |
| Subscription plans/codes/entitlements | `src/app/admin/subscriptions/actions.ts` | `revalidatePath("/admin/subscriptions")`, `revalidateTag(public:majors)`, `public:subjects`, `public:quizzes` | Major/subject/quiz public data that may show paid access state or plan availability. | Admin subscriptions page path. |

## Detailed Notes by Area

### Public Content

Public content is intentionally cacheable because institutions, majors, subjects, quiz previews, and SEO metadata are mostly stable. The current default is conservative:

- Public list data: usually 3600 seconds.
- Public detail data: usually 21600 seconds.
- Home preview/platform stats: currently fetched with 600 seconds in the country home page.

This is a practical strategy for Vercel because it reduces repeated Prisma/Neon reads while allowing tag invalidation after admin content edits.

### Private Student Flows

The following must remain uncached:

- Quiz runtime: `/quiz/[id]` and `/api/v1/student/quizzes/by-id/[id]`.
- Quiz grading: `/api/v1/student/quizzes/grade`.
- Quiz results/review pages.
- Subscription status: `/api/v1/student/access/status`.
- Subscription redemption: `/api/v1/student/access/redeem`.
- Manual payment requests: `/api/v1/student/access/payment-request`.

Reason: these depend on `AnonymousSession`, access entitlements, submitted answers, or current student/session state. Shared CDN caching would leak or stale user-specific state.

### Admin Area

Admin UI and API responses are private. Even when an admin endpoint uses `unstable_cache` internally, the HTTP response still sends `private, no-store`, so browsers/CDNs should not store a shared response.

This is correct for security. The tradeoff is that admin data freshness depends on either:

- Explicit `revalidateTag(...)` calls after mutations.
- The internal `unstable_cache` TTL.
- Direct Prisma queries on pages marked dynamic/no-store.

### Analytics

Admin analytics currently use no-store request behavior. This is suitable because the dashboard is private and the data now depends on real `QuizAttempt`, `UserAnswer`, and `AnonymousSession` rows.

The unused `CACHE_TTL.adminAnalytics = 86400` is available if daily rollups are introduced later, but live analytics should not be confused with Vercel Analytics/Speed Insights.

## Watch Items / Potential Improvements

These are not code changes made by this report. They are audit findings for future cache hardening.

### 1. Public quiz list route has public CDN cache but no tag-bound `unstable_cache`

File:

- `src/app/api/v1/student/quizzes/route.ts`

Current behavior:

- Sends `Cache-Control: public, s-maxage=3600`.
- No `unstable_cache` wrapper or tags were found in this route.

Risk:

- `revalidateQuizCache` invalidates quiz tags, but this route response itself is not visibly bound to those tags. On Vercel, this can mean the route relies on TTL rather than immediate tag invalidation.

Suggested later fix:

- Wrap the list query in `unstable_cache` with tags:
  - `public:quizzes`
  - `student-quizzes`
  - optionally `public:quizzes:subject:{id}` when filtered by subject.

### 2. Public select endpoints rely on CDN TTL only

Files:

- `src/app/api/v1/student/universities/select/route.ts`
- `src/app/api/v1/student/majors/select/route.ts`
- `src/app/api/v1/student/subjects/select/route.ts`

Current behavior:

- They use public `Cache-Control`.
- No `unstable_cache` tags were found.

Risk:

- After admin mutations, these may rely on TTL unless Vercel revalidates the full route response by other means.

Suggested later fix:

- Add small tagged `unstable_cache` wrappers:
  - `public:institutions` for universities select.
  - `public:majors` for majors select.
  - `public:subjects` for subjects select.

### 3. Public SEO endpoints rely on public headers but not visible cache tags

Files:

- `src/app/api/v1/student/seo/university/[...slug]/route.ts`
- `src/app/api/v1/student/seo/major/[...slug]/route.ts`
- `src/app/api/v1/student/seo/subject/[...slug]/route.ts`
- `src/app/api/v1/student/seo/quiz/[...slug]/route.ts`

Current behavior:

- Public long CDN header.
- `revalidateSeoCache` invalidates SEO tags, but the route handlers do not appear to bind their payloads to `unstable_cache` tags.

Risk:

- SEO changes may rely on the 21600 second TTL for these specific route responses.

Suggested later fix:

- Add `unstable_cache` with `public:seo` and `public:seo:{ownerType}:{ownerId}` tags, or revalidate relevant paths if route-level metadata depends on page HTML.

### 4. Mixed namespaced and legacy literal tags

Files:

- `src/lib/cache-tags.ts`
- `src/lib/cache-invalidation.ts`
- Several admin API/action files.

Current behavior:

- The project uses both namespaced tags like `public:quizzes` and legacy literal tags like `quizzes`.

Risk:

- Easy to miss a cache during future changes if only one naming style is used.

Suggested later fix:

- Keep compatibility now, but gradually migrate all new code to `CACHE_TAGS`.
- Replace literal tags in admin routes/actions where safe.

### 5. Admin list TTL constant is not consistently used

File:

- `src/lib/cache-tags.ts`

Current behavior:

- `CACHE_TTL.adminList = 60`, but several admin list `unstable_cache` wrappers use literal `3600`.

Risk:

- Admin list data could stay stale longer if a mutation forgets to call the matching revalidation tag.

Suggested later fix:

- Replace literal admin list TTLs with `CACHE_TTL.adminList` where internal caching is still desired.

### 6. Component-level `export const revalidate` does not control routes

Files:

- `src/components/public/major-details.tsx`
- `src/components/public/subject-details.tsx`
- `src/components/public/quiz-details.tsx`

Current behavior:

- These files export `revalidate = 21600`, but they are components, not route segment files.

Risk:

- Developers may think these values control page caching. In Next.js App Router, route segment config belongs in `page.tsx`, `layout.tsx`, or route handlers.

Suggested later fix:

- Remove or replace these exports with comments/documentation if no route depends on them.

### 7. Admin dashboard uses layered caching

Files:

- `src/app/admin/page.tsx`
- `src/app/api/v1/admin/dashboard/route.ts`
- `src/lib/admin/dashboard.ts`

Current behavior:

- The page fetch asks for `next.revalidate: 300`.
- The API route response is `private, no-store`.
- The underlying data helper uses `unstable_cache` with tag `dashboard`.

Risk:

- The effective cache source is the helper, not the HTTP response. This is acceptable, but should be documented to avoid confusion.

Suggested later fix:

- Prefer direct server helper calls from the admin dashboard page, or keep the current pattern but make the cache ownership explicit.

## Where To Change Cache Durations

| Need | Change Here |
| --- | --- |
| Public list/detail TTL defaults | `src/lib/cache-tags.ts` -> `CACHE_TTL.publicStable`, `CACHE_TTL.publicLong`. |
| Home preview TTL | `src/app/[cc]/page.tsx` -> `fetchJSON(..., 600)` calls. |
| Public route page ISR | Route files such as `src/app/[cc]/[type]/page.tsx`, `src/app/[cc]/[type]/universities/[...slug]/page.tsx`, `src/app/quizzes/page.tsx`. |
| Student API CDN headers | Route handlers under `src/app/api/v1/student/**` using `CACHE_CONTROL.publicSMaxage(...)`. |
| Admin dashboard TTL | `src/lib/admin/dashboard.ts` -> `DASHBOARD_REVALIDATE_SECONDS`. |
| Admin page dashboard fetch TTL | `src/app/admin/page.tsx` -> `next: { revalidate: 300 }`. |
| Admin list internal cache TTL | Admin route handlers under `src/app/api/v1/admin/**` using `unstable_cache(..., { revalidate: 3600 })`. |
| Private/no-store policy | `src/lib/cache-tags.ts` -> `CACHE_CONTROL.PRIVATE_NO_STORE`. |

## Recommended Caching Policy Going Forward

### Public/student content

Recommended default:

- Lists: 1 hour (`publicStable`).
- Details and SEO: 6 hours (`publicLong`).
- Home preview sections and platform stats: 10 minutes (`600`) until invalidation coverage is fully consistent.

Reason:

- Content is mostly stable.
- Admin edits should invalidate content tags.
- TTLs are conservative enough to recover from missed invalidation.

### Admin pages and APIs

Recommended default:

- HTTP responses: always `private, no-store`.
- Internal server/data cache: short TTL only where expensive queries exist.
- Prefer direct Prisma/server helpers for initial admin page data when possible.

Reason:

- Admin data is sensitive and must not be shared through CDN.
- Short internal caching is acceptable when mutation invalidation is reliable.

### Analytics

Recommended default:

- Live admin analytics: `private, no-store`.
- Future daily rollups: `adminAnalytics` TTL can be used for precomputed aggregate rows only.

Reason:

- Current analytics are educational/operational and should reflect recent attempts.
- Vercel Analytics should remain the source for visits/devices/countries/Core Web Vitals.

### User-specific student state

Recommended default:

- Always no-store.

Applies to:

- AnonymousSession access status.
- Subscription redeem/payment request.
- Quiz runtime/results/review/grading.

Reason:

- Data is session-specific and should never be cached in a shared layer.

## Manual Verification Checklist

Use these checks after future cache changes:

1. Public institution edit:
   - Edit a university in admin.
   - Confirm `/SA/university` and the university detail page update after invalidation or TTL.
   - Confirm `/api/v1/student/universities?...` returns updated data.

2. Major/subject edit:
   - Edit a major or subject.
   - Confirm detail pages and nested lists update.
   - Confirm public stats update if counts changed.

3. Quiz/question edit:
   - Edit a quiz or import questions.
   - Confirm subject quiz list and quiz preview update.
   - Confirm quiz runtime stays private/no-store.

4. SEO edit:
   - Edit SEO metadata.
   - Confirm route metadata/API payloads update.
   - Pay special attention to SEO endpoints that currently appear to rely on public TTL only.

5. Subscription plan change:
   - Enable/disable a paid plan.
   - Confirm admin subscription page refreshes.
   - Confirm public major/subject/quiz UI eventually reflects the paid/free state.
   - Confirm access status endpoint remains private/no-store.

6. Admin endpoints:
   - Open Network tab on admin API calls.
   - Confirm `Cache-Control` is `private, no-store, no-cache, max-age=0, must-revalidate`.

7. Student private endpoints:
   - Check quiz runtime, grade, results, review, access status, redeem, and payment request endpoints.
   - Confirm no public cache headers are present.

## Final Assessment

The current cache system is generally safe: admin and user-specific data are protected with no-store, while public content is cacheable. The main improvement area is consistency. Public content should preferably use both:

- `Cache-Control` for CDN behavior.
- `unstable_cache` with precise `CACHE_TAGS` for immediate invalidation after admin mutations.

The most important routes to harden later are:

- `src/app/api/v1/student/quizzes/route.ts`
- `src/app/api/v1/student/*/select/route.ts`
- `src/app/api/v1/student/seo/**/route.ts`

Until those are tag-bound, their freshness may depend more on TTL than on explicit invalidation.

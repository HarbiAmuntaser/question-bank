# Vercel Cache Verification Checklist

Use this checklist after deploying cache changes to Vercel. It does not require new endpoints.

## Public Pages

1. Open a public country page, for example `/SA`.
2. Open an institution listing page, for example `/SA/university`.
3. Open one hierarchy page: institution, major, subject, and quiz preview.
4. Confirm response headers include a public `cache-control` policy on public API calls.
5. Confirm quiz runtime pages stay private/no-store:
   - `/quiz/{id}`
   - `/quiz/{id}/results?session=...`
   - `/quiz/{id}/review?session=...`

## Admin Mutation Invalidation

For each change below, update from the admin UI, then refresh the matching public page:

1. University name/logo/status: public institution pages and country listings should update.
2. Major name/status: major page, institution page, and subject lists should update.
3. Subject name/status: subject page and quiz lists should update.
4. Question import/update: subject quiz lists and quiz previews should not remain stale.
5. Quiz title/status: quiz preview/list pages should update.
6. SEO metadata: public metadata should update for the affected owner.

## Header Spot Checks

Run these against the production domain:

```bash
curl -I https://your-domain.vercel.app/api/v1/student/universities?cc=SA&type=university
curl -I https://your-domain.vercel.app/api/v1/student/quizzes
curl -I https://your-domain.vercel.app/api/v1/student/quizzes/grade
curl -I https://your-domain.vercel.app/api/v1/admin/universities
```

Expected:

- Student public list endpoints: `cache-control: public, s-maxage=3600, stale-while-revalidate=60`.
- Student stable detail/SEO/preview endpoints: `cache-control: public, s-maxage=21600, stale-while-revalidate=60`.
- Student grade/runtime endpoints: `private, no-store`.
- Admin endpoints: `private, no-store`.

## Vercel Signals

Check `x-vercel-cache` over repeated requests:

- First request may be `MISS`.
- Repeated public request may become `HIT` or `STALE`.
- After an admin mutation, affected public content should refresh without waiting for the full TTL.

If content remains stale after a mutation, inspect whether the changed entity has a matching public tag in `src/lib/cache-invalidation.ts`.

# Search indexing rollout

`SEARCH_INDEXING_MODE` is an explicit production release control:

- `blog_only`: blog content may be indexed; education pages remain `noindex` and are omitted from the sitemap.
- `full`: eligible universities, colleges, majors, subjects, chapters, quizzes and summaries are added to the sitemap.

Any missing or unsupported runtime value remains fail-closed as `blog_only`. Production readiness is stricter and requires the variable to be explicitly set to `blog_only` or `full`.

## Before enabling full indexing

1. Keep `SEARCH_INDEXING_MODE=blog_only` while reviewing SEO records.
2. Ensure each education entity intended for indexing has an Arabic SEO record, a stable non-UUID slug and `noindex=false`.
3. A College also requires an active University with a usable SEO slug and at least one active Major.
4. Ensure stored canonical URLs match the public route. Blog variants whose canonical points elsewhere are intentionally omitted from the sitemap.
5. Run the production-shaped readiness check and the targeted search-indexing tests.
6. Change only `SEARCH_INDEXING_MODE` to `full`, redeploy, and verify the live sitemap before submitting it to Search Console.

## Live verification gate

Do not treat HTTP 200 from `/sitemap.xml` as sufficient because dynamic sections fail independently. Verify all of the following:

- the sitemap contains known University, College, Major, Subject, Chapter, Quiz and Summary URLs expected for launch;
- every sitemap URL returns 200 without a redirect;
- every sitemap URL is indexable and has a self-referencing canonical;
- no duplicate URL or UUID fallback route is present;
- `robots.txt` references `https://mustawak.com/sitemap.xml`;
- the sitemap is submitted to Search Console only after these checks pass.

If an expected dynamic section is absent, restore `SEARCH_INDEXING_MODE=blog_only` and inspect the server warning for that sitemap section before retrying.

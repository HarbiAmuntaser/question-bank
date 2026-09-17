# Payment P3: Scoped Account Access

P3 implements the account/scope foundation for manual subject payments. It is not
the production launch or the later payment-review/receipt workflow. P1 checkpoint:
`3d4ba6d`. P2 changes remain prerequisites, including its staging acceptance.

## Scope and Release Switches

- Payment v1: `SA + university + subject`, resolved from
  `Subject -> Major -> University.countryCode/institutionType` on the server.
- No URL, country cookie, browser-supplied role, userId or anonymousSessionId
  establishes payment scope or ownership.
- Published YE/academy/out-of-scope material bypasses payment checks. Blog remains
  outside this system. Publication, active parents and administrative protection
  still apply. No new major-level plan or grant is accepted.
- `PAYMENT_V1_ENABLED=false` is the default. Code issuance/redemption and manual
  requests are closed. SA material explicitly marked paid remains locked; an
  inherited active eligible subject plan also remains locked. Explicit free and
  preview quizzes stay open. Inherited material with no eligible subject plan is
  free. Turning payment off does not publish protected material.
- `STUDENT_REGISTRATION_ENABLED=false` remains unchanged. Test-only flags are
  enabled in child processes using disposable loopback databases, never production.
- Inactive eligible plan drafts may be prepared while payment is closed. Activating
  plans or issuing codes requires the payment switch. Existing active plans are not
  silently deactivated by editing through the closed-release form.

## Ownership and Authorization

- New entitlements and requests use authenticated, active, email-verified student
  `userId`. P2 session/version validation is reused; administrative accounts cannot
  purchase through student endpoints. Mutation transactions recheck identity/version.
- Legacy anonymous entitlements/requests are retained without automatic ownership
  backfill. Legacy codes become `paymentVersion=0`, cannot be upgraded or redeemed,
  and may be disabled. New codes are version 1. Existing code use counts are intact.
- Any legacy customer reconciliation requires a separate approved, audited process;
  possession of a browser cookie is not proof of purchase or account ownership.
- Ownership, subject targets and code/plan associations are immutable. New writes
  have server validation plus PostgreSQL triggers for eligible scope and ownership.
- Account deletion is rejected while financial records reference it (HTTP 409 in
  user administration); disable the account instead. Deleting a subject cannot
  cascade away its entitlements. Plan/code deletion may also be
  blocked by immutable historical references. P3 adds no financial deletion flow.
- Redemption is serializable, bounded-retry and idempotent per account/code. A
  single-use code cannot grant two racing accounts. Retrying an expired/revoked
  grant is not renewal and never increments usage again.
- Access requires an active, started, unexpired exact-subject entitlement. Legacy
  major/anonymous grants never authorize v1. Disabling a code stops new redemption;
  it does not revoke previously issued entitlements. Revoke the entitlement itself.
  Disabling a plan also stops new sales; inherited material without another active
  subject plan becomes free, while explicitly paid material remains protected.
- Pending/contacted requests are idempotent per account/plan. This is request capture
  only, not payment confirmation or automatic entitlement approval.

## Content Delivery

- One access policy covers quiz content/context, grading, summary HTML and PDF.
  Protected bodies are never placed in the shared public metadata cache.
- Publication/active-parent checks happen before subscription decisions, including
  hidden chapters, draft summaries and future publication dates.
- All quiz subject contexts are considered. Mixed ownership involving an eligible
  SA university subject fails closed; no first-question ownership shortcut. Such
  records require editorial correction before launch.
- Out-of-scope public metadata advertises free access, so the frontend skips status
  requests. The old major subscription callout was removed entirely.
- Quiz play/review/results server reads forward the current cookie only to the
  configured trusted origin and use `no-store`, not a visitor-controlled host.
- Paid summary PDFs must be private R2 objects served after authorization via a
  short-lived signed URL. Public/local/external paid PDFs are rejected by the download
  route. This does NOT make an existing publicly accessible object private: audit and
  migrate/remove old public copies and inspect embedded HTML/media links before launch.
- Anonymous quiz-attempt tracking remains unchanged, but is not used for payment
  ownership and is created only after the grading access check succeeds.

## HTTP and Admin Controls

- Strict JSON schemas reject extra client authority fields. Request payloads are
  bounded to 8 KiB. Same-origin validation and private/no-store responses are enforced.
- Distributed PostgreSQL rate limits: IP 30 requests/15 min/action; account code
  redemption 10/15 min, payment requests 5/hour. Errors fail closed. Rate-limit storage
  and trusted proxy configuration are inherited from P2 and must be deployed first.
- Admin plan selection searches eligible active SA university subjects only. The
  server independently revalidates selections. All actions retain P1 role guards.
- Admin tables show account email or an unclaimed-legacy badge, never a session token.
- Public UI distinguishes closed payment, student sign-in and account activation.
  `/account` remains the simple P2 account page, not a payment dashboard.

## Migration

`prisma/migrations/20260911090000_account_subject_payments/migration.sql`

1. Add nullable `AccessEntitlement.userId`, its foreign key and lookup/unique indexes;
   make anonymous ownership nullable for new account-owned records, and prevent
   subject deletion from cascading away entitlements.
2. Add nullable `ManualPaymentRequest.userId/subjectId`, foreign keys and lookup index.
3. Add `SubscriptionCode.paymentVersion`: existing rows 0, new default 1.
4. Install scope/ownership guard functions and triggers in a transaction.

No current user's role or password changes. No anonymous row is claimed, no old
code's used count changes, and no payment price/currency schema is changed. Nullable
fields preserve history; triggers prevent new unowned or out-of-scope writes.
Use the checked-in migration, not `db push`, because Prisma schema does not encode
the trigger logic. P2's two migrations must run first. Do not run an old anonymous
payment writer against the migrated schema or downgrade the application blindly.

Before production: back up/restore-test the database, review migration status and
actual schema drift, exercise all migrations on a production-like staging copy,
assess table-lock duration, and keep payment/registration switches closed. Review
legacy customer handling and private PDF readiness before separately approving launch.
The historical repository migration chain has not been certified here from an empty
production database; the automated suite creates the P1 schema checkpoint then applies
the actual P2/P3 migrations, also checking repeat deploy and final schema drift.

## Verification

```text
node --test tests/admin/authorization.test.mjs tests/admin/fetch.test.mjs tests/admin/users.test.mjs tests/auth/policy.test.mjs tests/auth/http.test.mjs tests/payments/policy.test.mjs
node tests/auth/run-integration.mjs --payments --build
node node_modules/typescript/bin/tsc --noEmit
npm run lint
git diff --check
```

- Unit coverage: role/action isolation, auth policies, scope bypass without account
  queries, strict payloads, fail-closed flags and trusted authenticated server reads.
- Migration coverage: P2 collision rollback, unchanged roles/passwords, safe seed,
  unchanged legacy payment ownership/counts, version quarantine and no schema drift.
- P3 database coverage: 13 groups covering forbidden writes, old-code claiming,
  scope injection, concurrent redemptions, per-account isolation, expiry/revocation,
  private PDF enforcement, idempotent requests, CSRF, payload limits and rate limiting.
- Browser coverage: closed release, YE/academy no subscription requests, scoped admin
  plan draft, login callback, real dialog redemption, fresh-browser access, unrelated
  account rejection, admin isolation and session-version revocation. P2 browser/email
  regression is included. Screenshots are saved in the isolated test artifact folder.

### Local Results (2026-09-12)

- 85 unit tests passed across P1, P2 and P3.
- P2 service/database checks: 10 groups passed. P3: 13 groups passed, including
  the final shared publication filters and subject-deletion protection.
- P2 browser regression: 7 groups passed, artifacts `.tmp/p2-1789214251043`.
- P3 browser acceptance: 6 groups passed with zero runtime errors; desktop/mobile
  screenshots and optimized build artifacts: `.tmp/p2-1789214808560`.
- Final migration/database rerun: `.tmp/p2-1789215117603`. Legacy data remained
  unclaimed; repeat deploy was safe and schema drift was empty.
- Optimized Next.js build passed, including TypeScript and all 33 static pages.
  Standalone TypeScript, lint and `git diff --check` also passed. Lint retains existing
  warnings in unrelated code; no new P3 lint errors were introduced.
- The complete run found and fixed a real plan-selector layering issue; the successful
  P3/browser/build rerun used `--payments --skip-auth-browser --build` after the P2
  browser regression had passed. The final database rerun used `--no-browser --payments`.

Production migration, real email/provider verification, public registration,
payment activation, P4 and the deferred sitemap release are not performed by P3.

# Payment R1 - Limited Release Controls

## Scope and Decisions

- R1 only: release configuration, approved sale plans, access continuity, UI state and regression tests. No R2 security cleanup, R3 legacy deletion, production migration or public launch.
- Payment scope remains SA + university + subject, derived from the stored subject hierarchy. The launch list narrows sales; it never expands the P0 scope.
- The initial launch uses saved orders and explicit P5 Admin approval. It does not require an activation code. Code issuance and redemption remain disabled by default and require a separate release decision after their remaining security/policy review.
- The owner confirmed there are no real legacy subscribers or student sessions to preserve. R1 does not create a legacy-account migration project or delete existing records. Removal of obsolete structures remains R3; administrator accounts and site content are not disposable student test data.
- No actual launch plans were selected without the owner's list. The configured default is an empty list, which opens no sales, even if the old payment switch is true.
- No schema changes or migrations are needed for R1. P2-P5 migration files are unchanged. P5 must still be present on any database running this application.
- Actual `.env` / `.env.local` files and site data were not modified. Test processes override their own flags and use only disposable loopback databases.

## Server Configuration

| Setting | Default | Responsibility |
| --- | --- | --- |
| `STUDENT_REGISTRATION_ENABLED` | `false` | Existing P2 registration gate; mail configuration is also required. No change to sign-in or recovery. |
| `PAYMENT_V1_ENABLED` | `false` | Existing switch retained for new sales and the existing Admin plan-activation guard. It is no longer a master switch for access, review or codes. |
| `PAYMENT_LAUNCH_PLAN_IDS` | `[]` | JSON array of approved plan IDs for catalog, quotes and new orders. New sales require a nonempty valid list AND the sales switch. |
| `PAYMENT_REVIEW_ENABLED` | `false` | Existing-order contact, student review submission and all Admin financial review writes, including approval and recorded settlements. Independent of new sales. |
| `PAYMENT_CODES_ENABLED` | `false` | Both Admin code issuance and student redemption. Independent of sales; disabled for the initial direct-order release. |

Switches accept only the exact value `true`. Missing values, `TRUE`, `1` and whitespace variants do not open operations. The launch list must be valid JSON containing at most 200 nonempty IDs, each 1-100 letters/digits/underscores/hyphens. Duplicate IDs are deduplicated. Oversized, malformed or partly invalid lists fail closed as a whole; there is no wildcard or implicit all-plans fallback.

These are server environment settings, not editable student fields or client-side switches. All application instances must receive the same reviewed configuration through the deployment's normal restart/redeploy procedure. No live configuration API or public launch action was added.

The subscriptions administration page displays separate sales/review/code states, the configured list count, plan IDs and list membership. Membership is not proof that a plan is active, eligible, correctly priced or has a valid recipient: the existing server validations still apply.

## Access and Sales Are Separate

- Public out-of-scope content and explicit free/preview material still bypass payment identity/entitlement queries. Publication, active parents and administrative restrictions remain enforced.
- A valid existing subject entitlement continues to authorize quizzes, summary HTML and private PDFs when every payment-write switch is false or its plan is removed from the sale list.
- An expired/revoked entitlement, disabled account, wrong account or unpublished resource is not made accessible by changing release flags.
- An anonymous visitor can still reach student sign-in while sales are paused. This is necessary for an existing purchaser returning in a new browser; it does not open registration or reveal paid content.
- The student access DTO supplies `canPurchase` and `canRedeemCode` separately. Purchase links appear only for an approved plan currently on sale; the code form is omitted when codes are disabled. Server endpoints enforce the same gates independently of UI state.
- When a subject has multiple active plans, purchase options prefer a plan in the approved sale list. Unlisted active plans still participate in the existing inherited-content protection policy.
- Removing a plan from the launch list is a sale-control operation, not a content-publication or entitlement change. Do not use `PaidAccessPlan.isActive=false` merely to pause sales: under the existing P3 policy, inherited content without an active subject plan becomes free. Explicitly paid content remains protected.

## Existing Orders and Financial Rules

The launch list is checked in catalog, quote and new-order creation, including inside the creation transaction. A saved quote does not authorize a new order after its plan is removed. A mixed cart containing an unlisted plan is rejected without creating a partial order.

Existing saved orders are not retrospectively rejected just because their plan leaves the sale list. With review enabled, their owners can contact the configured channel and submit for review; Admin can document receipts, corrections, settlements and explicitly approve. P5 still revalidates the actual student, subject scope, active plan, financial balance and overlapping grants at approval. The launch list does not waive those checks.

Read-only order history remains available to its authorized owner/Admin when writes are stopped. Student cancellation retains its existing pending/no-financial-history restrictions and does not depend on opening sales or review. Review closure does not automatically cancel, expire or rewrite any order or ledger.

All P5 requirements remain: 24-hour expiry only for untouched pending payment, no automatic expiry after documented payments/review, no partial access, no automatic approval at full payment, append-only corrections, manually documented excess settlement, atomic multi-item approval and no automatic renewal through orders.

### Operating States

| State | Sales | Review | Codes | Result |
| --- | --- | --- | --- | --- |
| Before launch | off, list empty | off | off | No new financial operations; authorized history and previously granted access still work. |
| Stop new sales / finish pending work | off, or remove selected plans | on | off | No new affected orders; existing orders can be reconciled and approved. |
| Initial direct-order launch | on, approved list only | on | off | Saved orders and explicit approval, without a second activation channel. |
| Financial processing incident | preferably stop sales first | off | off | No new review/ledger/approval writes; preserve history and existing access. |

The controls are independent: sales technically can remain on while review is off. That combination is tested, but it is not the normal launch configuration; do not accept new orders when the team cannot review them. Closing sales alone is not an emergency stop for review or code operations.

Student requests or contact messages are never proof of payment. Admin must verify the transfer and its reference outside the site before recording it. Partial, excess and conflicting payments remain manual review responsibilities; do not resolve them by deleting a record or editing database balances.

Post-approval refund/reversal is not implemented by R1. An approved order remains final under P5. Any such case must be escalated with its order reference and evidence, without an ad hoc balance/grant rewrite. The audited handling procedure and administrative revocation gap remain explicit R2/prelaunch decisions; this report does not claim a complete post-approval refund facility.

## Preparing the First Sale List

1. Keep sales, registration and codes closed. Identify the intended Saudi university subjects and create/review their plan drafts through the existing administration.
2. Verify the chosen plan IDs, prices in SAR, durations and contact recipients. Provide the exact plan list for release approval; do not infer it from every active plan or the current URL/country cookie.
3. Put only the approved IDs in `PAYMENT_LAUNCH_PLAN_IDS` on staging. Check that the catalog and direct quote/create APIs exclude every other plan and still reject out-of-scope IDs even when listed.
4. Rehearse sales pause, review-only operation and access continuity on staging. Real mail, proxy/rate-limit configuration, private storage and remaining security checks belong to R2-R4.
5. R5 deploys a reviewed build and matching configuration while closed. R6 requires separate explicit approval before opening any production operations. Configuring a list alone is not launch approval.

## Verification

```text
npm run test:admin
npm run test:auth
npm run test:payments
npm run test:orders
npm run test:reviews
npm run test:release
node tests/auth/run-integration.mjs --payments --orders --reviews --release --no-browser
node tests/auth/run-integration.mjs --payments --orders --reviews --release --build
node tests/auth/run-integration.mjs --reviews --release --skip-auth-browser --build
node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit
git diff --check
```

The existing ignored local PostgreSQL/Playwright/SMTP tools are required by the integration runner. The runner overrides both database URLs, all release switches and mail credentials. It does not migrate or seed the configured site database.

- Unit regression: 104 passed, including 7 new R1 policy groups.
- Standalone TypeScript: passed after the application changes.
- Database/service acceptance: P2 10, P3 13, P4 14, P5 17 and R1 6 groups passed. Actual migrations, preservation checks and schema drift also passed. Artifacts: `.tmp/p2-1789397405440/`.
- Browser regression: P2 7, P3 6 and P4 7 groups passed in `.tmp/p2-1789397540384/`. The P5/R1 browser suite passed all 9 groups without runtime errors in `.tmp/p2-1789398455094/`, including sales-only, review-only, launch-list removal, access continuity and Admin session revocation. Mobile/desktop screenshots were inspected; overflow, clipped controls and broken images are also asserted by the browser tests.
- The first combined browser run completed its functional assertions but failed the final runtime-error check with one network error. To avoid interrupting open document streams during deliberate flag-change restarts, the test harness now navigates those documents to `about:blank` before stopping the dev server. It still captures and rejects every browser runtime error. The focused rerun passed without changing application code or weakening the assertion. The passing browser evidence is from these two runs, not a single uninterrupted full-suite run.
- Final optimized production build: passed, including TypeScript, lint and static page generation, against the isolated database with registration/sales/review/codes closed and the launch list empty. The focused run also repeated P2 10, P5 17 and R1 6 database groups successfully. Artifacts: `.tmp/p2-1789398455094/`. Existing lint warnings in unrelated quiz/SEO/content modules remain; the build reported no lint errors.
- `git diff --check`: passed; only existing line-ending conversion notices were reported.

### Local Preview

The local preview is running at `http://localhost:3000/auth/signin`, using a fresh disposable loopback database, not the site's database. No site content or accounts were copied. SMTP, registration, new sales, review and codes are disabled, and the launch list is empty. Preview database directory: `.tmp/p2-preview-1789398990465/`.

HTTP smoke checks passed: student sign-in page 200; registration, new order, code redemption and student review POST requests 503; unauthenticated Admin order history 401. This is a closed local preview, not a staging or production release.

## Areas Changed

- `payment-scope.ts`: centralized independent switches and strict server-owned launch list.
- `access-control.ts`, access DTO and public subscription components: entitlement-first paid access, separate purchase/code capabilities and no inactive code form.
- Order, review and code services/HTTP handlers: independent gates at HTTP and service/transaction boundaries; sale-list enforcement for new orders only.
- Student order pages, Admin subscription/review pages and error messages: accurate control states and plan-list visibility.
- `.env.example`, release policy/database tests, existing browser regressions, integration runner and package test scripts.

No legacy deletion, payment schema change, automatic refund, Google Login, sitemap/full-mode release or production launch is included.

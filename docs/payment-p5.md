# Payment P5 - Manual Review and Account Activation

## Scope and Baseline

- P5 only. No P6, gateway, public launch, Google Login or sitemap/full-mode changes.
- P0 remains SA + university + subject, derived from Subject -> Major -> University, never browser country/URL/cookies.
- P1 checkpoint: `3d4ba6d`. Existing uncommitted P2/P3/P4 work was preserved; it was not swept into a new commit.
- The user reported applying P2/P3/P4 migrations. P5 does not edit those applied migration files. Their original SHA-256 values are asserted in `tests/reviews/policy.test.mjs`.
- Real environment files, roles, passwords, ownership and production data were not changed by this work.
- `PAYMENT_V1_ENABLED=false` and `STUDENT_REGISTRATION_ENABLED=false` remain release requirements. Isolated acceptance tests temporarily enable payment only in child processes with disposable local databases.

## Implemented Flow

1. A verified student creates an immutable P4 order, then explicitly submits it for review after sending transfer details through the existing contact channel.
2. Submission records a review event only. It is not evidence of receipt, creates no ledger entry and grants no access.
3. Admin records actual verified receipts using a unique, normalized transfer reference, decimal SAR amount and mandatory internal reason.
4. Partial receipts remain under review. Admin can request the remainder with a separate student-visible message. The student can resubmit after supplying further details.
5. An exact paid balance still remains under review. Only explicit Admin approval can activate all items.
6. An overpayment records a blocked-approval conflict. Admin must manually settle it, record the completed refund with its own reference/reason, then explicitly approve.
7. Approval creates one account-owned entitlement per order item, using the saved duration and a shared approval instant. No activation code is generated or consumed.

Admin pages: `/admin/payment-orders`, `/admin/payment-orders/[id]`.

Student history/detail remain under `/account/orders`. Student detail shows the verified net balance, remaining/excess amounts, current state and the latest 20 explicitly public messages. It never includes internal notes, bank references, actor identities or the administrative audit payload.

The administration list supports reference/name/email search, status filters and 30-row pagination. Detail includes frozen items, balances, review actions, entitlement links and paginated immutable activity (30 events per page).

## Expiry and State Rules

| Situation | P5 behavior |
| --- | --- |
| Untouched `pending_payment` | Original 24-hour deadline applies; effective expiry on reads and lazy persistence on replacement creation remain from P4. |
| Student/Admin submits for review | State becomes `pending_review`; original expiry no longer applies. |
| Any verified ledger history | Cannot become `expired` or `cancelled`, even if all receipts were later voided. |
| `awaiting_additional_payment` | No automatic expiry; no 48-hour financial write-off. Remains a manual review responsibility. |
| Receipt arrives after cancellation, expiry or rejection | Admin can document it; order reopens in `pending_review` without losing the original P4 audit. |
| Partial balance | No access and no partial-item approval. |
| Exact balance | Still needs explicit approval. |
| Excess balance | Approval is blocked; no automatic approval/refund. |
| Rejection with a nonzero net balance | Blocked until a documented settlement brings the balance to zero. |
| Approved order | Final in P5. New financial mutations and grant rewrites are rejected; an identical approval retry returns the previous result. |

Late transfers can reopen an old order even when a newer cart exists. Review orders therefore no longer use the P4 active-cart unique slot. Subject-overlap checks at creation and approval prevent silent double activation; financial conflicts remain visible for manual resolution.

## Immutable Financial Ledger

Amounts are server-side Prisma Decimal / PostgreSQL DECIMAL, never client-authoritative totals or floating-point sums.

- `receipt`: positive amount with a unique external reference.
- `refund`: negative amount documenting a refund already completed outside the site. It does not initiate a transfer. The entered refund cannot exceed the verified net balance.
- `void`: exact inverse of an existing entry, retaining that original entry.
- `correction`: replacement value paired atomically with a void of the prior entry. Zero means void-only. The direction (receipt/refund) cannot be changed.

A correction requires a reason, cannot cross orders and cannot correct a void or an already corrected entry. A replacement can itself be corrected later, preserving the entire chain. The original external reference remains permanently reserved, including after correction. Duplicate-reference retries never add credit twice.

Ordinary receipts and corrections never approve an order. Correcting a genuine recording error is distinct from documenting a real refund; the administrator is responsible for verifying that distinction.

## Approval and Concurrency

- Approval requires the exact net documented balance, a currently active verified student, active eligible plans and currently published/active SA university subjects.
- Current prices and durations do not rewrite the accepted P4 snapshot. Saved price/duration apply; removed/ineligible plans or subjects block approval.
- Existing active subject entitlements, including unexpired scheduled grants, block implicit renewal. Other open orders sharing a subject block approval; unrelated subjects do not.
- The service locks the account/actor and order, rechecks current Admin role/session version, and requires an optimistic `expectedVersion` plus an idempotency key.
- A dedicated account-lock version forces a fresh SERIALIZABLE snapshot after a competing grant writer. Row locks alone were insufficient: a controlled acceptance test demonstrated the stale-snapshot race before this was added.
- Code redemption shares this synchronization. Database grant triggers also synchronize independent account grant inserts/updates. No session version, role or password is changed by this mechanism.
- PostgreSQL serialization/deadlock errors returned by explicit locks as Prisma `P2010` (`40001`/`40P01`) are retried with the existing bounded transaction policy.
- Status, approval audit, account synchronization and every entitlement are in one SERIALIZABLE transaction. Any item failure rolls everything back; previously committed verified payments remain intact.
- `AccessEntitlement.orderItemId` is nullable/unique and immutable, with restrictive financial foreign keys. Historical entitlements are not backfilled or claimed.
- Deferred SQL constraints reject approved orders missing an item grant, missing audit, or without an exact verified balance. Grant ownership, target, duration and approval instant are checked in SQL as well.
- Expected business conflicts create `approval_blocked` audit events without grants. A failed approval does not publish the success message drafted for the student.
- Student/admin history reads use a single REPEATABLE READ snapshot for status, audit and balance, preventing a mixed view of an old expired status and a newly recorded receipt.

## Authorization and Privacy

- New admin pages and APIs require `subscriptions:manage`, currently Admin only. Editor, moderator, student and unauthenticated requests are denied.
- Services independently authenticate the current user and recheck Admin role/activation/session version inside the transaction. Financial audit triggers validate the actor too.
- Student review APIs accept only `expectedVersion` and `idempotencyKey`; no money, role, userId, evidence or internal-note fields.
- Mutations require exact same-origin JSON, strict Zod schemas, 8 KiB request-body limits and distributed PostgreSQL rate limiting. Limiter failures fail closed.
- Admin financial writes have a 60-per-15-minute account limit; admin reads have a 120-per-minute limit, plus an IP limit. Existing student limits remain in use for submission.
- Private/no-store responses, private account/admin pages, noindex metadata and escaped React text are retained. Public registration remains closed.
- Admin payment-order pages additionally use `no-referrer` and are excluded from telemetry, including client-navigation events, so searches containing student emails are not sent to analytics.
- No payment proof uploads, attachments or new external messaging calls are added.

## Migration

New additive migration: `prisma/migrations/20260913090000_payment_review/migration.sql`.

Reviewed file SHA-256: `2C34BBC94678014FB3245ADBA549E1986E59926D75851AADBA54FF17CA9D5B99`.
This migration has been tested on disposable local databases, not applied to the configured site database.

It adds:

- `PaymentReviewAction` and `PaymentLedgerKind` enums.
- `payment_review_events`, `payment_ledger_entries`, `payment_account_locks`.
- `PaymentOrder.reviewStartedAt` and `reviewVersion`.
- Nullable unique `AccessEntitlement.orderItemId` and its order-item relation.
- Review/ledger immutability, actor/state checks, deferred financial/grant balance validation and account synchronization.
- A replacement P4 order-write guard and active-cart constraint for the new review states; P4 item snapshot checks and its original audit table are retained.

There is no ownership backfill, fabricated payment/grant, role change, password update or edit to an applied migration. The account-lock table starts empty and does not invalidate login sessions.

Local migration tests construct a real P1 baseline, apply actual P2/P3/P4 files, create a P4 order/items/audit, then apply P5. They compare original rows, roles/passwords and P3 historical ownership, repeat deployment and check Prisma schema drift.

### Deployment Checklist

1. Keep both release flags false. Take a restorable backup and review P5 SQL against the deployed P4 schema.
2. Run the new migration on staging first using the normal migration deployment workflow, not `db push` or `migrate dev` against production.
3. Generate the matching Prisma client, build the matching application and run the full acceptance command below against an isolated database.
4. Verify staging state transitions, duplicate references, partial/overpayments, corrections, account conflicts and a multi-item rollback with test users.
5. Schedule production migration/application deployment together. Do not run financial workflows from old application instances during the schema rollout.
6. Verify applied migration status and health while release flags remain false. Public launch requires separate explicit approval.

Do not attempt a destructive down-migration once financial records exist. Close payment writes and use a reviewed forward fix or the deployment's backup/restore procedure.

## Verification Commands

```text
npm run test:admin
npm run test:auth
npm run test:payments
npm run test:orders
npm run test:reviews
node tests/auth/run-integration.mjs --payments --orders --reviews --build
node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit
npm run lint
git diff --check
```

The integration runner requires the existing ignored local PostgreSQL/Playwright/SMTP tool installation. It always substitutes loopback test database URLs, temporary mail credentials and test-only flags. It never applies migrations to the configured site database.

## Local Verification Results

Verified on 2026-09-14. Browser coverage was completed in separate runs; the results below do not claim a single successful all-browser invocation.

| Check | Result | Run / Evidence |
| --- | --- | --- |
| Authorization and policy unit tests | 97/97 passed | Admin, auth, payment, order and review test files; final rerun after application changes. |
| PostgreSQL/service acceptance | 54 groups passed: P2 10, P3 13, P4 14, P5 17 | `node tests/auth/run-integration.mjs --payments --orders --reviews --no-browser`; `.tmp/p2-1789321338007/`. |
| P2/P3 browser regression | P2 7/7, P3 6/6; no runtime errors | `.tmp/p2-1789320886976/browser-results.json` and `p3-browser-results.json`. |
| Final P4/P5 browser acceptance | P4 7/7, P5 7/7; no runtime errors | `node tests/auth/run-integration.mjs --orders --reviews --skip-auth-browser --build`; `.tmp/p2-1789337510610/p4-browser-results.json` and `p5-browser-results.json`. This run also repeated P2/P4/P5 database groups successfully. |
| Migration safety | Passed | Actual P1 -> P2 -> P3 -> P4 -> P5 deployment, preserved P4 order/items/audit and existing users/history, repeat deployment, no Prisma schema drift. |
| TypeScript | Passed | Standalone `tsc --noEmit` after the final application changes; production build type checking also passed. |
| Lint | Passed with existing unrelated warnings | No P5 lint warnings; existing quiz/SEO/shared-component warnings remain outside this change. |
| Production build | Passed, exit code 0 | Completed in the final P4/P5 acceptance command; uses only the isolated test database with release flags disabled. |
| Diff whitespace check | Passed | `git diff --check`; existing CRLF normalization notices only. |

An earlier combined browser run stopped on a development-server `ECONNRESET` during P4 session revocation while source files were being edited. The final P4/P5 run kept application source unchanged and passed that assertion without relaxing it.

Desktop (1440px) and mobile (360px/390px) screenshots were checked in the final run for partial receipts, overpayment, approval, corrections and student order states. Automated checks found no horizontal page overflow, clipped controls, broken loaded images or browser runtime errors. Screenshots are under `.tmp/p2-1789337510610/p5-*.png`.

An isolated local preview was started at `http://localhost:3000/auth/signin` with both release flags false and SMTP disabled. It has a fresh local database, not site data or existing administrator accounts. Smoke checks passed: sign-in page 200, registration POST 503, student order creation POST 503, unauthenticated admin payment-orders API 401. Current preview process details are in the ignored `.tmp/p2-preview-ready.json`.

## Deliberately Deferred

- Public payment/registration launch and every phase after P5.
- Payment proof uploads, gateways, automated refunds, discounts, partial-item grants and automatic renewals.
- Post-approval refund/reversal workflows: P5 does not silently revoke paid access or rewrite finalized orders. These require a separately approved policy and implementation.
- Historical external-code behavior remains P3-owned; P5 orders do not generate codes.
- No payment/subscription enforcement is added to YE, academies or blog. Existing publication/admin protections remain.

# Payment P4: Manual Payment Orders

P4 adds saved student orders before manual contact. It is not payment approval,
receipt upload, automatic entitlement delivery, or a public release. P1 checkpoint:
`3d4ba6d`. P2 and P3 remain prerequisites. The user reports their migrations have
been applied; no staging/production database was inspected or migrated in P4.

## Scope and Release

- Only active, public Saudi university subjects qualify, using the P3 server policy:
  `Subject -> Major -> University.countryCode=SA, institutionType=university`.
- Orders contain 1-10 distinct subjects, one selected active subject plan per subject.
  No URL, country cookie, anonymous session or client identity establishes scope.
- YE, academies and blog stay outside payment. Existing publication, private
  content and administrative protections remain unchanged.
- `PAYMENT_V1_ENABLED=false` and `STUDENT_REGISTRATION_ENABLED=false` stay closed.
  New checkout, catalog, quote and contact endpoints fail closed while payment is
  disabled. Verified students may still read their own history and cancel their
  own unexpired pending order. No other state can be cancelled in P4.
- `/account` gains only a link. `/account/orders`, `/account/orders/new` and
  `/account/orders/[id]` are private, no-store, noindex and excluded from telemetry.

## Order and Quote Contract

- The server reads eligible plans, requires positive SAR prices and valid durations,
  sums with `Prisma.Decimal`, and returns exact two-decimal strings. Null/zero/negative
  prices and non-SAR currency cannot become orders; no guessed pricing is backfilled.
- Creation takes only plan IDs, contact method, quote version and an idempotency UUID.
  Strict validation rejects client totals, roles, user IDs, recipients and status.
- Quote version is an optimistic SHA-256 fingerprint, NOT a signed authorization or
  trusted price token. Creation reloads all prices, names, durations and contacts
  inside the transaction and rejects changes with `quote_changed`. The student must
  confirm the refreshed quote; it is never silently submitted at a new price.
- The saved order has a unique human reference, authenticated userId, one item per
  subject, immutable price/name/duration snapshots and total, and a **24-hour** expiry.
  New order/audit dates use `timestamptz(3)` so expiry comparisons and event instants
  do not depend on the PostgreSQL session timezone. UI dates use `Asia/Riyadh`.
  Duration begins with a future entitlement grant, not order creation; null duration
  retains the plan's existing unlimited-duration meaning.
- Idempotency is scoped by userId and key. Same payload/key returns the same order,
  including cancelled/expired history. A reused key with changed input returns 409.
- A unique per-user active cart key covers the sorted selected plan IDs, independent
  of order or contact method. Identical active selections return 409 with the owned
  existing order ID. This is not a reservation of every subject across all possible
  carts, and different accounts remain independent.
- P4 does not charge or renew access, or reject every overlap with an existing
  entitlement. Renewal policy and overlapping purchases must be resolved in the
  later approval phase before launch; no entitlement is changed here.
- Serializable transactions with bounded retries protect creation, cancellation,
  handoff and lazy expiry against concurrent calls. Database uniqueness is the final
  duplicate guard. Never rely on disabled UI buttons for correctness.

## Manual Contact

- The student first reviews the quote and saves the order. Only its private details
  page may prepare a WhatsApp or Telegram handoff, through an authenticated POST.
- Reuse existing plan contacts. Multi-item orders require one common normalized
  destination for the selected channel. The UI only offers common channels. A cart
  without a common recipient cannot be submitted; use separate orders or configure
  consistent plan contacts. No new global contact settings are introduced in P4.
- The server rechecks current plan activity/scope and recipient before handoff.
  Price edits do not rewrite a saved quote within its validity. Removed plans or
  changed recipients block handoff and require a new order after cancellation.
- Message includes order reference, subject names, item prices, total and expiry.
  No student name, email, userId, session, browser URL or credential is included.
- WhatsApp gets encoded message text. Telegram opens the configured account, with
  a separate copyable message. No message is sent automatically, and no third-party
  link is prepared before the order has been successfully stored.
- A contact event records **preparation**, not proof that the external app opened,
  a message was sent, money arrived or a student received an entitlement.
- The old `/api/v1/student/access/payment-request` now returns 410
  `order_flow_required` for valid authenticated requests while enabled (503 while
  disabled). It creates no new legacy record. Old rows and the historical P3
  service remain intact; the public interface no longer calls that writer.

## States and Audit

| Operation in P4 | Transition |
| --- | --- |
| Create | New -> pending_payment |
| Prepare/retry contact | pending_payment -> pending_payment |
| Student cancels before expiry | pending_payment -> cancelled |
| Validity ends | Effective display becomes expired; no handoff or cancellation |
| Replace expired identical cart | Old pending_payment -> expired, then a new order |

`pending_review`, `awaiting_additional_payment`, `approved` and `rejected` are
reserved enum values for later phases. P4's service and database guards do not
permit entering them. There is no hidden approval API, admin order UI or receipt
claim button. Later phases must explicitly extend the state machine and audit.

Reads never change financial data. No expiry cron is needed for correctness:
deadline checks prevent using stale orders, and replacement atomically releases
the expired active-cart slot. Expired history remains visible even before that
lazy database transition. A future review queue must use the same effective expiry.

Created/contact/cancel/expire events are unique per order/type and append-only.
Snapshots and ownership cannot be rewritten; deletion of orders/items/events is
blocked. Financial references prevent deleting associated users/subjects/plans.
Disabling an account is preferable to deleting financial history.

## HTTP and Authorization

- Every service requires an active, email-verified student and P2's validated current
  session. Writes recheck role, activation, verification and sessionVersion inside
  the transaction. Student/admin portals and P1 permission guards are unchanged.
- All item reads and actions query both order ID and current userId. Another user's
  order returns 404. Human references are identifiers, never authentication tokens.
- POST requires exact configured Origin, same-origin fetch context and JSON; body
  is limited to 8 KiB. Responses are private/no-store and no-referrer.
- Distributed PostgreSQL limits: IP 60/minute/action; account create 5/hour;
  other writes 30/15 minutes/action; reads 60/minute/action. Limits count attempts,
  including retries and invalid submissions. Backend failure returns 503; there is
  no in-memory allow fallback. P2 proxy/trusted-IP configuration still applies.
- List uses stable createdAt/id keyset pagination (20/page) with validated cursors.
  A cursor can move within the current user's history but never change ownership.
- All callbacks use the existing safe internal callback policy. No new OAuth, role
  assignment, mail delivery, entitlement checks or content locking was added in P4.

## Migration and Deployment

New additive migration:
`prisma/migrations/20260912090000_payment_orders/migration.sql`.

1. Create order status/event enums and three tables: `payment_orders`,
   `payment_order_items`, `payment_order_events`.
2. Add foreign keys, indexes and unique reference/idempotency/active-cart/item/event
   constraints. Database checks reject invalid amounts, currency, durations/states.
3. Add write guards for verified ownership, eligible scope, exact plan snapshots,
   immutable history and P4-only transitions. Deferred constraint triggers require
   complete items, an exact balanced total and matching audit events at commit.

Existing tables acquire only Prisma reverse relations, not new SQL columns. P4
does not alter `AccessEntitlement`, `ManualPaymentRequest`, codes, plan pricing,
roles or passwords. It creates no fabricated orders or inferred purchase ownership.
Old P2/P3 migration bytes remain unchanged:

| Migration | SHA-256 |
| --- | --- |
| 20260910090000_add_student_role | 495882136E9A174DEAD7A0C3745BD44439AF40CD01845E70167F40E28A502480 |
| 20260910090100_student_accounts | 9710BE5089BB617359908E89297AE72061DC00A9A4C5B43D424DDAFDDF32BF47 |
| 20260911090000_account_subject_payments | 99E56D917086D2FEF19726F8C71FB0E3775BAD8D1FE53B11284265809B1EBFE1 |

Reviewed P4 migration SHA-256:
`36E3BA48F99D838186BD8B25463B4F00A641C858DC79A71B268CDDF4FE7F9703`.

Before production, back up and restore-test, review `prisma migrate status`, confirm
P2/P3 prerequisites and actual drift, apply the checked-in migration to staging,
run acceptance against realistic data and review privileges/lock duration. Use
`prisma migrate deploy`, **not db push**, which omits these SQL guards. Deploy the
generated Prisma client and application after migration, keeping both release flags
false. No production command has been run as part of this work.

For rollback, close payment and keep the additive tables/history; do not drop order
tables or return to the old public contact writer. Prefer a forward fix. A later
approval phase must revalidate owner, scope, status, expiry and amount and atomically
grant each item to userId with an idempotent item-to-entitlement link. P4 does not
implement that link, partial payment accounting, receipt storage or refunds.

## Local Verification

- Unit suites: 88 passed across admin, auth, scope and orders.
- Isolated PostgreSQL migration/service run: P2 10, P3 13, P4 14 acceptance groups.
  P4 includes expiry/cancellation/audit tests with `Asia/Riyadh` and
  `America/Los_Angeles` PostgreSQL session timezones.
- Migration deploy/repeat deploy, SQL guards and schema drift checked on the P1
  schema checkpoint plus actual P2/P3/P4 migrations. Existing roles/passwords and
  legacy payment ownership remain unchanged. No new order is invented by migration.
- TypeScript passed; lint passed with existing unrelated warnings.
- Final `node tests/auth/run-integration.mjs --payments --orders --build` completed
  successfully, including the optimized Next.js build against the disposable
  database with registration/payment disabled. No production build data was read.
- Headless Chrome: P2 7, P3 6, P4 7 acceptance groups passed. P4 covers closed
  release, multi-item quote/save, failed-save retry, contact/copy, ownership/payload
  boundaries, duplicate cart, cancellation/history, and session revocation.
- Desktop 1440px and mobile 360px/390px screenshots were inspected; controls fit,
  assets loaded, and the browser reported no runtime errors. Clipboard comparison
  accounts for Windows CRLF; page screenshots wait for loaded history, not skeletons.
- Final integration artifacts: `.tmp/p2-1789237938128/`, including
  `p4-browser-results.json`, `p4-checkout-*.png`, `p4-contact-*.png`,
  `p4-cancel-mobile.png`, and `p4-history-*.png`. These are ignored test data.

Commands (test tools from the P2 setup are required):

```text
npm run test:orders
npm run test:orders:integration
node tests/auth/run-integration.mjs --payments --orders --build
```

The integration runner explicitly uses disposable loopback PostgreSQL and local
TLS SMTP, isolated test credentials and headless Chrome. Flags enabled inside its
test processes never alter `.env`, deployment configuration or production data.
This does not certify the entire historical migration chain from an empty production
database, external WhatsApp/Telegram delivery, real email, or a production launch.

## Files and Areas

- Schema/migration: only new order models/enums/tables and reverse relations on
  users, subjects and existing plans.
- `src/lib/server/payment-orders.ts`: quote/catalog, ownership, snapshots,
  idempotent mutations, expiry and manual handoff.
- `src/lib/server/payment-order-http.ts` and `src/app/api/v1/student/orders/`:
  authenticated APIs, CSRF, distributed limits and bounded payloads.
- `src/validations/payment-order.ts` and `src/lib/payment-orders.ts`: strict
  contracts, decimal strings and student-facing status labels.
- `src/components/payments/` and `src/app/account/orders/`: student selection,
  review, history, details, confirmation/cancellation and loading/error states.
- `/account`, subscription gate/action components and `payment-http.ts`: link to
  orders, replace direct contact, retain P3 code activation, retire legacy endpoint.
- `tests/orders/`, integration runner, relevant P2/P3 regressions and package test
  scripts: cover the new migration and flow without rewriting earlier acceptance.

# Payment R2 - Administrative Security and Audit

## Scope

- R2 only. Payment remains SA + university + subject, derived from stored data.
- Registration, new sales, financial review and activation codes are not enabled by this work. The launch plan list is still empty by default.
- No production/staging database was contacted or migrated. Actual `.env` / `.env.local` files were not changed.
- No legacy subscribers are being migrated or reconciled. Legacy deletion/private-media cleanup remains R3. No administrator accounts or content were removed.
- Activation codes remain outside the initial direct-order launch. Their existing engine was security-regression tested, not approved for production activation.

## Findings Addressed

| Finding | R2 change |
| --- | --- |
| Entitlements and codes could be disabled by a direct Server Action update, without a reason or audit | Authenticated services, required internal reason, transactional audit and confirmation dialog |
| Plan/code administration trusted an actor ID and did not recheck the session version in its transaction | Actor comes from the current authenticated session; Admin role, activation and sessionVersion are rechecked after locking user rows |
| Subscription Server Actions had no dedicated distributed throttle or explicit configured-origin check | Exact same-origin protection and separate PostgreSQL-backed IP/account buckets for reads and writes; limiter failure prevents the action |
| Admin order reads and financial writes shared a counter despite different windows | Independent read/write keys preserve the intended 60 writes per 15 minutes; a read cannot start a shorter financial-write window |
| Stale plan editors could overwrite newer changes | Required expectedUpdatedAt on updates; serialized writes, monotonic update timestamps and an explicit conflict response |
| One-click plan deactivation could change inherited content availability | Reason and explicit content-impact acknowledgement required, including deactivation through the edit form |
| Code plaintext remained in component state after closing its dialog | Closing clears the generated code from that component state |
| Subscription/audit pages needed explicit privacy coverage beyond order-review routes | No-store/noindex/no-referrer response headers and exclusions for both mounted and surviving telemetry callbacks |

## Sensitive Operations

The following services require a current Admin session independently of their calling Server Action:

- Create/update/deactivate a plan.
- Issue/deactivate a code.
- Revoke an entitlement.

Successful operations append a `PaymentAdminEvent` containing the actor, session version, action, target, reason, timestamp and server-generated before/after snapshots. Client-supplied actor/audit fields are not accepted. Code snapshots omit the plaintext, hash and preview; entitlement snapshots omit the anonymous-session identifier. No new secrets are logged.

Revocation/deactivation of a code or entitlement remains available to an authorized Admin even when sales/review/codes are closed. These are incident-response controls, not new sales. A required reason and current target timestamp guard the first change. Retrying an already disabled target is a no-op that preserves the original reason and creates no second audit record.

The target update and its audit share a SERIALIZABLE transaction. The application locks the affected users/target and checks current authority. Audit insertion failure rolls back the target change. Deferred database constraints reject unaudited code/entitlement deactivation; audit rows cannot be updated or deleted through ordinary DML. Re-enabling disabled codes/entitlements is not supported by this release.

Administrative plan operations and code issuance also write their audit in the same transaction. Database guards for deactivation specifically protect codes and entitlements; this is not a claim that arbitrary direct SQL plan edits can be attributed to a web session. Database credentials/DDL permissions must remain restricted during deployment. A database owner/superuser can alter or disable triggers; the audit is not an external tamper-proof log.

### Access Revocation Is Not a Refund

Revoking an order-backed entitlement changes only its activation/update state. It does not change the order, item ownership, approval instant, duration, payment ledger or financial review events. The existing unique OrderItem -> Entitlement link remains intact. The student does not receive the administrative reason or before/after data.

An approved P5 order is still final. R2 does not implement a post-approval refund, payment reversal, partial-item refund, automatic restoration or automatic renewal. Security-related access removal must not be recorded as if money was returned. Any actual post-approval financial dispute requires separate policy/implementation approval before using the site to account for it; never edit ledger rows or fabricate a replacement order to conceal it.

Disabling a code stops future redemption, not the entitlements already granted by it. Disabling a plan is still a content-policy change under P3, not the sales-pause control. Use R1 sales switches/launch membership to stop sales without affecting inherited content protection.

## Administration UI

- Existing `/admin/subscriptions` now has reasoned confirmation dialogs for plan/code/entitlement deactivation. Plan edits and code issuance include an internal reason field.
- `/admin/subscriptions/audit` is Admin-only and displays paginated audit history, before/after details and links to order-backed entitlements' orders. It has no edit/delete control.
- Existing Admin no-store, noindex, no-referrer and telemetry exclusions apply. Values are rendered as escaped text, not HTML.
- Stale-target, invalid-input and throttle failures are surfaced without returning database exception details.

## Migration

New migration: `prisma/migrations/20260914190000_payment_admin_audit/migration.sql`.

- Adds the `PaymentAdminAction` enum and `payment_admin_events` table, indexes, target/actor foreign keys, audit guards and deferred revocation guards.
- Existing Prisma models gain reverse relations only. Existing plan/pricing, entitlement ownership, payment-order and ledger columns are unchanged.
- The migration does not update users, passwords, roles, plans, codes, grants, orders or balances. It does not fabricate past audit events.
- P2-P5 migration files retain their original bytes. The new migration follows P5 and must not be substituted into or appended to an already applied migration file.
- Referenced audit history prevents deletion of its actor/target via normal foreign-key-protected operations. Archival/retention and any approved legacy cleanup must account for these dependencies.

### Deployment Sequence

1. Keep all registration/payment release flags false and sales list empty. Back up and review migration status on the target environment; P2-P5 must already be present.
2. Apply the new migration on staging using the normal reviewed deployment process, then regenerate/deploy the matching Prisma Client and application build.
3. Verify existing records are unchanged, the new audit is initially empty, and schema drift is absent. Rehearse revocation, audit failure rollback, stale editor rejection and permissions using disposable staging accounts.
4. Only after staging approval, deploy the matching application/migration to production while closed. Do not leave old and new application versions writing revocations concurrently: old unaudited revocations will intentionally fail the new constraint.
5. In an incident, close sales/review/codes, retain existing audit/history and use a reviewed forward fix. Do not drop the audit table or rewrite applied migrations as a rollback shortcut.

No target-environment migration was performed by Codex in R2.

## Verification

```text
npm run test:admin
npm run test:auth
npm run test:payments
npm run test:orders
npm run test:reviews
npm run test:release
npm run test:security
node tests/auth/run-integration.mjs --payments --orders --reviews --release --security --no-browser
node tests/auth/run-integration.mjs --payments --orders --reviews --release --security --build
node tests/auth/run-integration.mjs --orders --reviews --release --security --skip-auth-browser --build
node tests/auth/run-integration.mjs --reviews --release --security --skip-auth-browser --build
node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit
git diff --check
```

- Unit regression: 112 passed, including 8 new R2 security groups. The historical plan-schema test permits only the new reverse audit relation, not pricing-column changes.
- Standalone TypeScript: passed after the service/UI changes.
- Database/service acceptance: 68 groups passed (P2 10, P3 13, P4 14, P5 17, R1 6, R2 8). Artifacts: `.tmp/p2-1789421321029/`.
- Migration verification: actual P1 baseline through R2, identical existing rows across the R2 migration, empty initial admin audit, repeat deployment and no Prisma schema drift passed on isolated PostgreSQL.
- R2 database tests cover Admin/session isolation, stale edits, concurrent duplicate revocation, audit failure rollback, append-only/actor constraints, code secrecy, release closure and preservation of approved financial records.
- Browser acceptance: 32 groups passed across separate isolated runs, not one uninterrupted run. P2 7 and P3 6 passed in `.tmp/p2-1789421502069/`; P4 7 passed in `.tmp/p2-1789480646561/`; P5/R1/R2 12 passed in `.tmp/p2-1789481272308/`. Each completed browser result file reports `runtimeErrors: []`.
- The first combined browser run was interrupted during P4. The next focused run passed P4 and then failed an overly specific cache-header assertion: Next's development HTML response used `no-store, must-revalidate` rather than the middleware's literal `private, no-store`. The corrected test requires `no-store` and rejects `public`/`s-maxage`, while separately asserting no-referrer and noindex. No application behavior was relaxed to make that test pass. The final focused run completed all 12 browser groups and the optimized build with exit code 0.
- The final run also repeated all 41 selected P2/P5/R1/R2 database groups successfully. Build-time lint/type checking passed with warnings in existing unrelated areas; the build is successful, not warning-free.
- Desktop/mobile audit screenshots and mobile plan/revocation confirmations were inspected in `.tmp/p2-1789481272308/`. Confirmation text fits; the audit uses a horizontally scrollable table on mobile without page-wide overflow. Browser checks also cover layout, escaped injected text, student denial, cross-origin Server Action denial and immediate session revocation.
- `git diff --check` passed; Git reported existing CRLF normalization notices, not whitespace errors.
- The local background verification helper records successful completion in `.tmp/r2-verification-status.json` and final output in `.tmp/r2-final-verification-out.log` / `.tmp/r2-final-verification-error.log`. The earlier assertion failure remains in `.tmp/r2-verification-out.log` / `.tmp/r2-verification-error.log`; these are not the final run's result.

### Closed Local Preview

- Started an isolated local preview at `http://localhost:3000/auth/signin`, with all release switches false, an empty launch list and SMTP disabled. It uses a fresh loopback PostgreSQL database, not site accounts or content.
- Seven HTTP smoke checks passed: sign-in 200; registration, order creation, code redemption and review submission 503; anonymous Admin orders API 401; anonymous audit page 307 to Admin sign-in with no-store, no-referrer and noindex headers.
- Current preview metadata is in `.tmp/p2-preview-ready.json`; logs are `.tmp/r2-preview-out.log` and `.tmp/r2-preview-error.log`. The preview is for local closed-state inspection, not a production deployment or a seeded administrative demo.

## Remaining Launch Gates

- External package-advisory verification is not completed. The attempted `npm audit --omit=dev` process was blocked by the permissions reviewer before execution because it would disclose dependency names/versions to `registry.npmjs.org`. Explicit approval was requested; no dependency inventory was transmitted by that attempt and no workaround was used. A passing local test/build is not evidence that dependencies have no known advisories.
- Local installed-version inventory, without a network query: Next 15.3.8, NextAuth 4.24.11, React/React DOM 19.1.0, Nodemailer 6.10.1 and Prisma Client 6.11.1. These are observed local versions, not a claim that they are current or advisory-free. No dependency upgrade or lockfile rewrite was performed in R2.
- Real reverse-proxy header rewriting, HTTPS, mail delivery, least-privilege database credentials, backup/restore, distributed throttling under deployment topology and operational monitoring still need R4 staging/production readiness verification.
- Existing public URLs/objects for paid media must be inventoried and secured in R3; route authorization alone cannot make an already public object private.
- The direct-order launch does not require activation codes. Enabling that channel later still needs its separate issuance/distribution/account-binding/renewal policy decision; do not enable it just because its technical tests pass.
- A final policy for handling actual financial disputes/refunds after approval remains a prelaunch business decision. This phase adds audited access revocation, not a complete refund system.
- No R3 work, public registration, Google Login, broader payment scope, sitemap full-mode change or production launch is included.

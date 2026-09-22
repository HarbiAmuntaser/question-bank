# Payment R3 - Legacy Cleanup and Private Media

## Scope

- R3 removes the retired anonymous/manual payment path and prevents public media from becoming paid content.
- Payment remains limited to `SA + university + subject`; no flag is enabled and no sales, review, registration or code channel is opened.
- `AnonymousSession` remains for quiz attempts, progress, visitor analytics and other non-payment behavior. R3 removes only its payment ownership relations.
- No applied migration was edited. No production/staging database, storage bucket, user, order, grant or audit record was contacted by this work.

## Legacy Cleanup

The migration `20260915110000_payment_r3_legacy_media_cleanup` does all cleanup in one transaction:

- Deletes legacy access grants that are anonymous, unowned, major-scoped, missing a subject, or tied to a retired code/invalid plan.
- Deletes old codes and plans outside the v1 scope. It removes the retired `paymentVersion` marker instead of retaining a dormant v0/v1 split.
- Drops `manual_payment_requests`, `ManualPaymentStatus`, `AccessEntitlement.anonymousSessionId` and `AccessEntitlement.majorId`; entitlement `userId` and `subjectId` become required.
- Retains the manual-request URL as a private `410 legacy_payment_request_retired` response. It has no request parser, authentication lookup, rate-limit write or database mutation.

Before deleting anything, migration preflight fails if an affected grant/code/plan is referenced by `PaymentAdminEvent` or a financial order item. It does not delete audit history, payment orders, order items, review events, ledger entries, account users, normal anonymous sessions or R2 objects. A failed preflight rolls back entirely and must be investigated rather than bypassed.

## Private Media Enforcement

For an in-scope SA university subject:

- An explicit `paid` summary requires an R2 private PDF with bucket and object key.
- An `inherit` summary requires the same once an active subject plan exists.
- An active plan cannot be created or activated while its paid/inherited summaries contain a public PDF or a direct public binary link in HTML/text.
- An attachment already assigned to a paid summary cannot be changed from private R2 storage to public storage.
- Free summaries and out-of-scope SA academy, YE and blog content remain outside subscription checks. Publication, draft and administrative protections are unchanged.

The policy exists in the Admin summary routes, payment-plan service and PostgreSQL triggers. The download route remains a final authorization check and returns a short-lived signed URL only for private R2 PDFs.

The migration intentionally refuses to apply when existing paid content has a public media blocker. Move the object to the private R2 bucket (or upload a replacement and reattach it), remove direct public binary links, then retry migration. Changing a database visibility field alone cannot make a previously public object private; confirm that the old public object is removed or access-blocked in the storage provider before launch.

## Verification

- Prisma Client was regenerated locally from the updated schema.
- The final targeted isolated PostgreSQL run passed: migration rejection for unsafe media, remediation/retry, legacy cleanup, no schema drift, P2 auth 10, P3 service 12, P4 service 14, P5 service 17, R1 service 6, R2 service 8 and R3 service 6 groups. Artifacts: `.tmp/p2-1789505538009/`.
- The final full regression passed against a separate loopback PostgreSQL instance: the same 73 database/service groups, 32 browser groups, and an optimized Next production build. Artifacts: `.tmp/p2-1789506062469/`.
- R3 tests verify that normal anonymous quiz tracking remains available, retired columns/tables disappear, order-backed grants without a code remain valid, paid PDFs cannot be public, plan activation blocks inherited public media/direct binary links, free/out-of-scope content remains allowed and the old endpoint is private `410`.
- TypeScript and lint for the final touched server file passed after removal of an unused legacy import. The production build reports pre-existing project lint warnings but completes successfully.

## Deployment Sequence

1. Keep every registration/payment release switch false and back up the target database. Confirm P2 through R2 migrations are present.
2. Inventory paid SA-university summary PDFs and direct media references. Transfer public objects to the private R2 bucket or upload replacements, then remove/block the old public copies at the storage provider.
3. Apply R3 on a production-like staging copy. A `payment_r3_private_media_required` or audit/financial preflight error is a blocker, not a reason to edit the migration or disable its checks.
4. Regenerate Prisma Client, deploy the matching application while closed, and verify the retired URL returns `410`, paid PDFs redirect only to a signed private URL and out-of-scope public content remains open.
5. Do not use a schema rollback that restores anonymous payment ownership. Use a reviewed forward migration if an issue is discovered after deployment.

## Remaining Gates

- `npm audit --omit=dev` could not run because this Yarn-managed repository has no `package-lock.json`; it exited with `ENOLOCK` and made no changes. A Yarn-compatible advisory scan remains pending.
- R4 remains responsible for staging/operational readiness: HTTPS/proxy behavior, actual R2 bucket access policy, mail delivery, backup/restore, production rate-limit topology and monitoring.
- R3 does not launch payment, registration, activation codes, Google login, sitemap full mode or production deployment.

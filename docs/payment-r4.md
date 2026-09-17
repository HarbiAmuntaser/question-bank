# Payment R4 - Closed-State Production Readiness

## Outcome and Boundaries

R4 prepares the application and operator runbook for production-like verification while every release channel stays closed. It does not enable student registration, new sales, financial review, activation codes, Google login, sitemap full mode or a production deployment.

The automated preflight is intentionally local and secret-safe. It validates configuration shape and prints check identifiers/messages only. It never prints environment values, connects to Neon, sends mail, reads an R2 object or changes a provider setting. Those live checks remain explicit operator gates.

## Commands

```text
npm run test:r4
npm run ops:preflight
npm run security:audit:read-only
```

`ops:preflight` requires a production-shaped environment. A successful automated report still returns `externalVerificationRequired: true`; it is not evidence that DNS, mail delivery, bucket policy, restore or monitoring work in the real providers.

The dependency command invokes Yarn Classic audit for production dependencies only. It is read-only: no install, fix, upgrade or lockfile/package manifest write. Advisories are a launch gate and must receive a separate reviewed remediation phase.

## Local Verification Record

- The R4 policy suite passes all five configuration, redaction, storage and audit-parser checks.
- The affected authentication, payment-scope, release-control and payment-security policy suites pass all 32 checks.
- TypeScript validation completes without errors.
- The final isolated full regression passes 73 PostgreSQL/service acceptance groups, 32 browser acceptance groups and the optimized production build. The build retains pre-existing lint warnings outside the R4 scope but has no type or build failure.
- The preflight fails closed when run without a production-shaped environment and exposes check IDs/messages only.
- No dependency or lockfile was changed by the advisory scan.

## Dependency Advisory Gate

The read-only Yarn Classic production-dependency scan found 64 unique advisories across 382 dependencies: 3 critical, 26 high, 32 moderate and 3 low vulnerability paths. Critical findings affect direct dependencies `next@15.3.8` and `next-auth@4.24.11`. High findings include direct dependencies `next`, `next-auth` and `nodemailer`, plus transitive TipTap, `linkify-it`, `nanoid`, `postcss`, `preact` and `sharp` packages.

These findings do not change closed-state behavior, but critical/high advisories block Limited Production Launch. Remediation requires a separately reviewed dependency update and regression phase; R4 intentionally performs no fix, install or upgrade.

## Required Closed Configuration

- `STUDENT_REGISTRATION_ENABLED=false`
- `PAYMENT_V1_ENABLED=false`
- `PAYMENT_REVIEW_ENABLED=false`
- `PAYMENT_CODES_ENABLED=false`
- `PAYMENT_LAUNCH_PLAN_IDS=[]`
- `NEXTAUTH_URL` is one exact HTTPS origin with no credentials/path/query/fragment.
- `NEXTAUTH_SECRET` is a non-placeholder value of at least 32 characters.
- `DATABASE_URL` and `DIRECT_URL` require TLS and target the same Neon endpoint/database. They may use separate least-privilege runtime and migration roles; runtime uses the pooled host and migrations use the direct host.
- SMTP and R2 values are present but do not open registration or payment while flags remain false.
- Public and private R2 buckets differ; R2 origins use HTTPS; signed URL TTL is 60-900 seconds.
- `AUTH_TRUSTED_IP_HEADER` remains empty until staging proves a proxy-overwritten, single-IP value. Empty uses the existing secure shared bucket behavior.

## Staging Runbook

1. Create or refresh a Neon staging branch from the intended production state. Never point Preview deployments at the production branch.
2. Configure Vercel Preview variables with staging-only database, R2 and SMTP credentials. Keep all release flags false and the plan list empty.
3. Run `npm run ops:preflight` in that deployment environment. Store the report, not the environment values.
4. Verify anonymous and student requests cannot reach Admin pages/APIs/actions. Confirm registration/order/review/code writes return their closed-state response.
5. With disposable staging accounts only, temporarily exercise mail in a controlled staging configuration: registration verification, resend and password reset. Return the registration flag to false immediately after the test.
6. Upload a disposable paid PDF to the private R2 bucket. Confirm its direct public/r2.dev/custom-domain URL is unavailable, the authorized route issues a signed URL, unauthorized access is denied, and the signed URL fails after expiry.
7. Observe the actual request headers at the trusted runtime without logging cookies, authorization or full IP chains. Configure `AUTH_TRUSTED_IP_HEADER` only if the chosen header is overwritten by the proxy and contains exactly one client IP; otherwise leave it empty.
8. Create a Neon restore target/branch from a known point and verify expected migration status and representative order/audit records. Do not rehearse restore in place on production.
9. Trigger disposable failures for application, database, R2 and SMTP paths and confirm the responsible person receives an alert. Logs must not contain passwords, tokens, signed URLs, payment internal notes or mail reset/verification tokens.
10. Run targeted tests during changes, then one full integration/browser/build regression. Keep the resulting artifact path and approve or reject the release gate explicitly.

## External Operator Gates

### Neon

- Runtime pooled URL and direct migration URL, isolated between Preview and Production.
- Reviewed least-privilege application role and separately controlled migration authority.
- Restore window/snapshot policy, successful branch restore rehearsal, connection/compute alerts and an owner for incidents.

### Vercel

- Environment variables scoped separately to Preview and Production; exact custom HTTPS production origin.
- Deployment protection for previews and review of generated deployment URLs.
- Function/error alerts and a tested secret-rotation procedure. Secret values belong in provider settings, never repository files or reports.

### Cloudflare R2

- Separate public/private buckets and bucket-scoped API credentials.
- Private bucket has no r2.dev public access and no public custom domain.
- CORS allows only required production/staging origins and methods when browser access needs it.
- Live authorized/unauthorized/expired signed-URL checks completed with disposable objects.

### SMTP and DNS

- Production sender/domain, restricted SMTP credential, controlled test recipient and successful TLS delivery.
- SPF, DKIM and DMARC verified; bounce/complaint monitoring and credential rotation owner assigned.

### Monitoring and Recovery

- Named alert recipients for Vercel, Neon, R2 and SMTP.
- Retention rules for application and payment audit logs, with sensitive-value redaction verified.
- Written stop-sales response: close sales/review/codes, preserve financial history, revoke access only through audited controls, and deploy forward fixes.

## Acceptance

R4 is complete when local code/tests/runbook are verified. It is externally approved only after every manual gate above has evidence. Neither status authorizes enabling release flags; Limited Launch remains a separate explicit decision.

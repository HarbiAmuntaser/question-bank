# Payment P2: Student Accounts

## Scope and release state

- P1 checkpoint: `3d4ba6d` (`security: complete Payment P1 administrative authorization`).
- P2 implements accounts only. No Google provider, payment UI, subscription checks,
  entitlement migration, payment schema edits, or sitemap release changes.
- P0 remains SA + university + subject for the future payment release. Creating an
  account does not grant access to unpublished content or administrative resources.
- Registration is closed by default and `.env.example` explicitly sets
  `STUDENT_REGISTRATION_ENABLED=false`. Existing deployment environment files were
  not edited. No migration was applied to the configured remote database.
- Test-only processes enable registration against an ephemeral loopback PostgreSQL
  database and a local TLS SMTP sink. No email is sent to external recipients.

## Account design

- Public registration accepts only name, email, password, password confirmation and
  an optional callback. Strict validation rejects role, activation, verification,
  sessionVersion and userId supplied by a client. Creation explicitly sets student.
- `normalizedEmail` is trimmed/lowercased, uniquely indexed and checked against the
  stored email at database level. Original existing email addresses are preserved.
- New passwords require 12 characters, without composition requirements. Spaces and
  password managers work. bcrypt cost is 12; new inputs exceeding 72 UTF-8 bytes are
  rejected instead of silently truncated. This permits 64 ASCII characters but
  fewer multibyte characters. Existing password hashes are not rewritten.
- Email verification is required before student login. Verification links expire
  after 24 hours and require the registration password to prevent activation of an
  account pre-registered by somebody else. Password reset also works for an
  unverified student, allowing the mailbox owner to recover that account safely.
- Reset links expire after 30 minutes, replace the password and verify ownership of
  the mailbox. Administrative accounts cannot be reset through student endpoints.
- Tokens are random 32-byte values; only SHA-256 hashes are stored. Consumption locks
  the user row, checks purpose/expiry/role/activation/version, then consumes every
  outstanding token and increments sessionVersion in one transaction. GET links
  never mutate data. A reset notification is sent after the transaction commits.
- Repeat registration never changes an existing user's name, password or role.
  Email request responses use generic messages; rate limits apply even to unknown
  emails. SMTP timing can still differ between eligible and nonexistent accounts;
  responses do not claim to provide timing-based enumeration resistance.

## Authentication and authorization

- Student: `/auth/signin`, provider `student-credentials`.
- Administration: `/auth/admin/signin`, provider `admin-credentials`.
- Registration: `/auth/register`; recovery: `/auth/forgot-password` and
  `/auth/reset-password`; verification: `/auth/resend-verification` and
  `/auth/verify-email`.
- `/account` is a server-protected name/email/verification view with reset and
  logout links, not a payment dashboard. Existing `/dashboard` is unchanged.
- JWT sessions have a rolling 30-day lifetime and the standard NextAuth HttpOnly,
  SameSite=Lax cookies (Secure on HTTPS). They work across ordinary browser restarts;
  private browsing, clearing cookies and expiration require signing in again.
- JWT refresh rechecks the database role, active flag, verification and version.
  Client session updates cannot set authority. Invalidated sessions have no usable
  server identity. Reset, verification, admin password/email/role/status changes
  revoke old sessions. Disabling and re-enabling does not restore old sessions.
- All pre-P2 JWTs lack sessionVersion and require one fresh login after deployment,
  including administrative users. This changes sessions, not passwords or roles.
- Middleware remains a preliminary role check. P1 page/API/Server Action guards
  remain authoritative and now compare sessionVersion against the database too.
- Student callbacks are internal absolute paths only, excluding auth/API/admin
  paths; administrative callbacks are restricted to `/admin`. External, protocol-
  relative, malformed and encoded bypass destinations fall back to a safe page.
  Valid internal callbacks are stored with verification/reset tokens for returning
  to the original page after signing in. No subscription logic is attached yet.
- Auth/account responses are private/no-store, noindex and no-referrer. Telemetry
  components omit these routes and also filter auth/token URLs before sending events.

## Rate limiting and mail

The distributed limiter uses the existing PostgreSQL database, not process memory
or an additional Redis service. A single atomic upsert uses database time, HMAC keys
and expiry. Independent server instances share the same counters. Database errors
fail closed; there is no in-memory fallback.

| Bucket | Limit |
| --- | --- |
| Sign-in per trusted IP | 60 / 15 minutes |
| Sign-in per normalized email, both providers combined | 10 / 15 minutes |
| Registration/resend/reset request per action and IP | 20 / 15 minutes |
| All email-sending actions per normalized email | 3 / hour |
| Token completion per action and IP | 30 / 15 minutes |
| Token attempts | 8 / 15 minutes |

- Auth JSON mutations require exact trusted Origin, application/json and a maximum
  8 KB body. NextAuth sign-in retains its built-in CSRF handling.
- `AUTH_TRUSTED_IP_HEADER` must name a single-IP header that the deployment proxy
  overwrites and clients cannot spoof. Do not blindly use X-Forwarded-For. Without a
  valid trusted header all callers share an IP bucket: safe but restrictive and
  susceptible to shared denial of service. Configure/test the proxy before launch.
- SMTP requires credentials and verified TLS (465 implicit TLS, other ports require
  STARTTLS). Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and
  AUTH_EMAIL_FROM. NEXTAUTH_URL must be the exact HTTPS deployment origin in
  production; NEXTAUTH_SECRET must be stable and shared by all instances.
- Mail configuration is validated locally; the flag does not automatically prove
  delivery or production readiness. Keep it false until real deliverability tests,
  sender authentication (SPF/DKIM/DMARC) and multi-instance limit checks pass.
- Schedule `npm run auth:cleanup` hourly in the deployment scheduler. It deletes up
  to 10,000 expired tokens and old expired counters per invocation, never users.
  Run additional bounded batches when necessary; scheduling is not enabled here.
- Add upstream edge/WAF limits for volumetric abuse; database limits are not DDoS
  protection. Monitor auth failures, mail delivery and limiter table growth without
  logging passwords, full token URLs or message bodies.

## Migrations and safe deployment

1. `20260910090000_add_student_role`: add the enum value in its own migration.
   PostgreSQL needs the enum addition committed before using it as a default.
2. `20260910090100_student_accounts`: transactional preflight for normalized email
   collisions, student default, normalizedEmail backfill/constraint/index,
   sessionVersion, UserAuthToken and AuthRateLimit. No existing role/password update.

Deployment procedure, not performed against production:

1. Keep registration false. Back up the target DB and rehearse restoration. Run
   `npm run auth:preflight` with explicit target connection settings. It reports only
   role counts and duplicate groups; failures require account-ownership review.
2. Inspect `prisma migrate status` and migration history on staging/production.
   The isolated test reconstructs the P1 schema, not the entire historic migration
   chain. Resolve any pre-existing migration drift before deploying P2.
3. Rehearse on a staging copy matching the production PostgreSQL version. Do not
   silently merge duplicate email accounts. Record active administrator IDs/roles
   and password hashes securely for before/after comparison, never in shared logs.
4. Coordinate a maintenance/write-freeze window for old application instances:
   normalizedEmail is now required, so old code must not create/update users while
   new code is being deployed. Do not use `db push` or `migrate reset` on production.
5. Run `prisma migrate deploy`, then `prisma generate`/application deployment with
   registration still false. Verify role/default/version columns, no duplicate
   normalized emails, preserved roles/hashes, and fresh administrative login.
6. Configure and verify real SMTP, trusted proxy header and cleanup scheduling.
   Repeat browser/P1 acceptance on staging, then deployment smoke tests while closed.
7. Open registration only as a separate explicit release decision after review.
   P2 completion does not authorize opening registration or starting P3.

Rollback: close registration immediately and use a coordinated application/DB
recovery plan. Do not drop student/auth data or restore the old admin default as an
automatic rollback. P1 code alone is not compatible with required normalizedEmail.

Seed is opt-in: SEED_ADMIN_EMAIL identifies the bootstrap account; a new admin also
requires SEED_ADMIN_PASSWORD. Existing active admins are not overwritten, even when
a different seed password is provided. Existing students/inactive admins are
rejected, not promoted/reactivated. The seed still populates demo content, so do not
run the full seed as part of normal production migration or password recovery.

## Verification

Completed locally on 2026-09-10:

| Check | Result |
| --- | --- |
| P1 authorization + P2 policy/HTTP regression | 78 passed |
| PostgreSQL/service acceptance | 10 groups passed |
| Migration preservation, collision rollback, repeat deploy, schema drift | Passed |
| Real seed preservation and fail-closed bootstrap | Passed |
| Browser acceptance | 7 groups passed, no page runtime errors |
| Desktop/mobile captures and text/image checks | Passed |
| TypeScript and optimized Next.js build | Passed |
| Lint and diff whitespace checks | Passed; existing unrelated lint warnings remain |

Browser artifacts: `.tmp/p2-1789000992106` (includes screenshots and
`browser-results.json`). Final migration/service/build run:
`.tmp/p2-1789001285667`. The optimized build caught a page-props signature error;
the signature and its test were corrected and both the full unit suite and build
were rerun successfully. These are local acceptance results, not production release
verification. The test PostgreSQL version is 18; staging must match production.

An isolated local UI preview is running at `http://localhost:3000/auth/signin`.
It has an empty local database, no production users, no configured SMTP and closed
registration. Administrative login is `/auth/admin/signin`. The preview helper and
its process metadata live under ignored `.tmp/`; it is not a deployment setup.

- P1/P2 unit regression: `npm run test:admin` and `npm run test:auth`.
- Static checks: `npx tsc --noEmit`, `npm run lint`, `git diff --check`.
- Local integration tooling (ignored directory, no runtime dependency change):

```powershell
npm install --prefix .tmp/p2-tools --no-save --package-lock=false embedded-postgres@18.4.0-beta.17 playwright@1.58.2 smtp-server@3.16.1 mailparser@3.9.3
node tests/auth/run-integration.mjs --build
```

The runner overrides both Prisma URLs with a random loopback-only test database,
uses real migrations, local TLS mail delivery and Chrome, then stops its services.
It leaves ignored artifacts in `.tmp/p2-*`. On other machines set P2_TEST_BROWSER,
P2_TEST_OPENSSL and optionally P2_TEST_TOOLS to installed executable/package paths.
Test output includes P1 preservation, collision rollback, SQL default, schema drift,
idempotent deploy, seed safety, token concurrency, distributed limits, session
revocation and student/admin isolation. Browser captures cover desktop/mobile and
check overflow, brand assets, registration closure, verification, login, cookies,
admin denial, reset and session revocation. Production deliverability and the
production migration remain deployment acceptance tasks, not claims of this test.

## Files and areas

- Prisma schema and the two P2 migrations; safe `prisma/seed.ts`.
- `src/lib/auth.ts`, auth policy/helpers/types, admin guards and middleware.
- `src/lib/server/auth-*`, student account service and student auth HTTP handler.
- `src/validations/student-auth.ts`, user validation and administrative user CRUD.
- Auth routes/components, minimal account page, header account link and telemetry.
- `.env.example`, cleanup/preflight scripts, package test commands, tests and this report.

Payment/entitlement models are compared byte-for-byte (ignoring line endings) with
the P1 checkpoint by an automated test. No P3 work is included.

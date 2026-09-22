# Payment P1: Administrative Authorization

P1 secures the existing administrative surface before student registration or account-based payments.

## Permissions

| Role | Dashboard / Analytics | Content | Users / Subscriptions |
| --- | --- | --- | --- |
| admin | Read | Read / Write | Manage |
| editor | Read | Read / Write | Denied |
| moderator | Read | Denied | Denied |
| Other / future student | Denied | Denied | Denied |

Content covers institutions, majors, subjects, chapters, questions, quizzes,
summaries, blog, SEO, attachments, and administrative lookups.

- `src/lib/admin-permissions.ts` defines the role matrix. Unknown roles and permissions are denied.
- `src/lib/admin-auth.ts` reads the authenticated user's current role and activation from Prisma on every guard call.
- Middleware performs a preliminary JWT role check; each page, API handler, and Server Action performs its own server check.
- Anonymous API requests return 401; authenticated but disallowed requests return 403.
- Mutation requests with cross-origin browser headers are rejected before reading the session.
- Administrative JSON responses and internal fetches use private/no-store behavior. Administrative data caches were removed.

## Service Keys and Origins

`ADMIN_API_KEY`, `x-admin-key`, and `x-api-key` no longer authenticate administrative requests.
No independent machine consumer was found in the repository. Deployment-side or external consumers
cannot be established from repository inspection and must be checked before deploying this change.

The administrative fetch helper forwards only the incoming session cookie. It removes service key
headers, rejects requests outside the administrative API origin/path, and refuses redirects.

Production requires `NEXTAUTH_URL` to identify this deployment's own trusted origin, including on preview deployments.
Development uses the current loopback server and port, even when `NEXTAUTH_URL` names production.
Do not restore automatic key injection to resolve an authentication error.

## Administrator Changes

Only an active admin can manage users. Updates and deletions recheck the actor inside a Serializable
transaction. The last active admin cannot be removed, disabled, or demoted. Self-deletion,
self-deactivation, and self-demotion are also rejected when other administrators exist.
Serialization conflicts retry up to three attempts, rechecking permissions on each attempt.

## Verification

- `npm run test:admin`: real route/action/guard modules with mocked sessions and database dependencies.
- `npx tsc --noEmit --incremental false`: TypeScript verification.
- `npm run lint` and `npm run build`: repository checks.

Tests cover direct calls without middleware, stale JWT roles, disabled/deleted users, role restrictions,
page guards, middleware redirects, session forwarding, response caching, and last-admin protection.
Transaction conflict tests simulate Prisma conflicts; they do not run concurrent transactions on a live database.
An authenticated deployment smoke test should exercise content editing, user management, role changes,
and session revocation with dedicated test accounts before release.

## Subsequent Payment Work

P1 does not change the Prisma UserRole enum/default or add registration. The existing default of admin
must be replaced with a non-administrative student default before opening student registration.
P1 does not implement or enable payment: P0's approved SA + university + subject scope remains the requirement
for the subsequent payment stages. Public publication rules, anonymous entitlements, and sitemap activation
are outside this change.

Reference: [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
and [Prisma transaction isolation](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions).

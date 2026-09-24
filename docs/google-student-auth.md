# Google Student Authentication

## Closed-state design

- `GOOGLE_AUTH_ENABLED=false` is the default. Missing or malformed Google credentials
  keep the provider and its UI unavailable.
- Google is a student provider only. `/auth/admin/signin` remains credentials-only,
  and the OAuth callback rejects inactive, unverified or non-student linked users.
- Existing linked Google students may sign in while public registration is closed.
  Creating a new Google user additionally requires
  `STUDENT_REGISTRATION_ENABLED=true` at callback and adapter creation time.
- Automatic email linking is disabled. A Google email matching any existing account
  produces `OAuthAccountNotLinked`; the user must use the existing sign-in method.
  Adding a second OAuth identity is also rejected. A future linking flow must begin
  inside a freshly authenticated session and is not part of this implementation.

## Stored identity

- Google authorization requests only `openid email`.
- A new user stores the normalized verified email, explicit `student` role,
  `sessionVersion=0`, active status and verification time. Google name and image are
  not persisted.
- The `Account` row stores only `userId`, provider, provider account ID and type.
  Access tokens, refresh tokens and ID tokens are deliberately discarded because
  the application uses Google only to establish identity.
- OAuth-only students start with `password=NULL`. The existing password-reset flow
  can establish a local password after mailbox verification. Credentials users and
  administrative authentication are otherwise unchanged.

## Configuration

Configure these values separately for each deployment environment:

```text
GOOGLE_AUTH_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For Production, the Google OAuth web client must use:

```text
Authorized JavaScript origin: https://mustawak.com
Authorized redirect URI: https://mustawak.com/api/auth/callback/google
```

For local real-provider testing, use a separate development OAuth client and the
exact local `NEXTAUTH_URL`, with `/api/auth/callback/google` appended. Never reuse or
commit Production credentials.

## Deployment and verification

1. Keep Google and student registration false. Review and apply the new migration
   with the normal backup/restore and migration-status controls.
2. Deploy with `GOOGLE_AUTH_ENABLED=false`; verify Credentials student/admin login,
   reset, session invalidation and account access.
3. Add Google credentials without enabling the flag. Confirm the closed-state
   readiness report and that no Google button/provider is exposed.
4. For a controlled Production test, explicitly enable Google while registration
   remains false. Only a previously linked test student can sign in; no new account
   may be created.
5. Opening new Google registration requires a separate approval to set
   `STUDENT_REGISTRATION_ENABLED=true`. Confirm new users are verified students with
   a null password and a token-free Google Account row.
6. Roll back by setting `GOOGLE_AUTH_ENABLED=false` and redeploying. Existing users,
   Accounts and Credentials login remain intact; do not delete identity records as a
   rollback shortcut.

Do not log OAuth authorization codes, provider tokens, client secrets, callback
queries or full authentication payloads.

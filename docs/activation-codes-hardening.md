# Activation Codes Readiness

## Release controls

Activation codes require both controls:

```text
PAYMENT_CODES_ENABLED=false
PAYMENT_CODE_PLAN_IDS=[]
```

`PAYMENT_CODE_PLAN_IDS` is a JSON array of explicitly approved plan IDs. It is
independent from `PAYMENT_LAUNCH_PLAN_IDS`; sales approval never enables code
issuance or redemption. Invalid, missing or oversized configuration resolves to
an empty allowlist. Existing entitlements continue to work when either code
control is closed.

## Issuance

- Issuance remains Admin-only and is re-authorized inside a serializable
  transaction.
- Each browser submission sends a UUID idempotency key. The database enforces one
  code per Admin and key, while a SHA-256 request hash detects reuse with changed
  inputs.
- The plaintext code is generated and returned only by the first successful
  request. A retry returns the existing code ID without plaintext and does not
  create another code or audit event.
- Only the code hash and non-secret preview are persisted. Idempotency never
  stores or reconstructs plaintext.
- A finite duration must come from the code or the current plan. Missing duration
  fails closed.
- `datetime-local` fields are interpreted as `Asia/Riyadh`, independent of the
  application server timezone.

## Redemption

- The global switch, code-plan allowlist, SA university subject scope, active
  plan, code state, start/end window and remaining uses are checked in the
  transaction.
- Retrying the same code by the same student returns its original entitlement
  without consuming another use or creating another event.
- A different code for a subject with an active entitlement is rejected before
  `usedCount` changes. It creates no entitlement or redemption event and does not
  schedule or extend access.
- Every successful redemption creates a finite entitlement and one immutable
  `payment_code_redemption_events` row linking user, code, plan, subject,
  entitlement, usage number and timestamp.
- Deferred database constraints require the entitlement and audit event for every
  code usage increment. Code ownership/state and redemption history are
  immutable through normal application writes.

## Closed rollout

1. Keep `PAYMENT_CODES_ENABLED=false` and `PAYMENT_CODE_PLAN_IDS=[]` while applying
   and verifying the migration.
2. Deploy and confirm existing payment orders, entitlements and Credentials/Google
   authentication without opening codes.
3. Add exactly one reviewed plan ID to `PAYMENT_CODE_PLAN_IDS`; keep the global
   switch false and verify the parsed allowlist in the Admin view.
4. Opening `PAYMENT_CODES_ENABLED` requires a separate Production approval and a
   controlled issue/redeem test. Do not copy IDs from the sales allowlist
   implicitly.
5. Roll back availability by setting `PAYMENT_CODES_ENABLED=false`. Do not delete
   code, redemption or entitlement history.

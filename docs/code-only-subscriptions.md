# Code-first subscriptions

This change uses the existing release controls. It does not migrate ownership,
create a new payment provider, or change grant/session lifetimes.

## Rollout settings (operator action, not changed by this implementation)

- PAYMENT_V1_ENABLED=false: closes catalog, quote and new manual orders at both
  HTTP and service layers. New-order links disappear and the direct page explains
  how to request a code.
- PAYMENT_REVIEW_ENABLED=true: keep existing-order contact, student submission,
  Admin receipts, ledger and review available.
- PAYMENT_CODES_ENABLED=true: permits code issuance, first activation, recovery
  and transfer. Each plan must also be active and activationCodesEnabled=true
  for issuance/first activation.
- Keep PAYMENT_LAUNCH_PLAN_IDS unchanged for a reversible return to manual sales.
- Do not change registration, Google, Telegram or any unrelated controls.

Deployment alone does not close manual sales if PAYMENT_V1_ENABLED is still true.
No production or local secret env files were edited for this change.

## Ownership and lifetimes

- Code validity (SubscriptionCode.startsAt/expiresAt) controls first activation.
- Grant duration is code.durationDays, falling back to the plan duration.
  CodeAccessGrant.startsAt/expiresAt are fixed at activation and never renewed by
  recovery, transfer, login, or reading a page.
- First activation while signed in as a verified student creates an account
  grant. Login on another device resolves the same account grant.
- First activation without that identity creates a guest grant and a browser
  binding. Login later does not claim or copy it. A signed-in account attempting
  that already guest-bound code is rejected.
- mw_code_access is a host-only, Path=/, HttpOnly, SameSite=Lax cookie, Secure in
  production, with Expires and Max-Age. A new GuestAccessSession expires with the
  grant. A reused session can be extended to the latest grant expiry without
  extending any individual grant. Cookie expiry uses this session expiry.
- Browser bindings have no separate expiry field: access requires an unrevoked
  binding/session plus a current active grant and session expiry.
- There is no inactivity timeout on guest access. A week/month away does not
  revoke it; the original expiry and browser retention still apply.
- qb_anon_session lasts 365 days when created and belongs to quiz attempts. Its
  expiry does not revoke a code grant.
- Account authentication uses JWT sessions with maxAge 30 days. Logout ends
  account authentication; it does not delete a guest access cookie or grant.

Persistent cookies normally survive ordinary browser/device restarts. Clearing
site data, a browser retention cap, privacy settings, or private-session disposal
can remove them sooner. A browser is not a hardware device identifier.
The HTTP first-party cookie must not be described as universally deleted by
Safari after seven days; script-writable storage and tracking mitigations have
different rules. Actual iOS Safari/Chrome testing requires physical devices.
Chrome also caps newly set persistent cookies at 400 days, so very long grants
may outlive a browser cookie and require recovery. No duration is changed here.

References:
- https://webkit.org/tracking-prevention/
- https://developer.chrome.com/blog/cookie-max-age-expires
- https://support.apple.com/guide/personal-safety/keep-your-browsing-history-private-ips375e6d608/1.0/web/1.0

For a lost cookie/new browser, enter the same secret code. If there is a free
binding slot recovery succeeds. Otherwise confirm transfer: it revokes the
oldest binding, preserving the grant dates. Default limit: one browser; first
transfer immediate, then ten minutes between transfers, at most three in 24h.
A previously revoked binding is not silently reactivated. Keep the code private.

## Telegram

No Telegram changes are needed to use codes instead of new manual orders.
A guest with an active cookie/binding can request a ten-minute, one-use link
token and join using the existing bot approval flow without a Mustawak account.
Membership belongs to the exact guest grant, not the browser cookie.
Cookie loss and browser transfer do not change Telegram identity or membership.
Expiry/revoke continues to remove access through the existing sync/outbox;
Disable Code alone does not remove current membership.

An existing signed-in student is resolved as an account principal first.
Consequently a guest who later signs in without account-owned access cannot
create a Telegram link from that account: there is no guest-to-account fallback.
They can continue the guest flow after signing out and using/restoring the guest
browser. Do not silently change this identity rule. A future Claim feature must
explicitly handle Telegram membership ownership.

## Verification and rollback

Run code-access runtime/public UX tests plus payments, orders, release, Telegram,
PDF viewer, chapters, targeted review and student-experience targeted tests.
The code-only suite exercises the real activation and order HTTP/service logic
with isolated in-memory database dependencies; it never connects to production.
The browser harness renders the real dialog with fixture access states.

Local commands:

    node --test tests/code-access/code-only.test.mjs tests/code-access/runtime.test.mjs tests/code-access/public-ux.test.mjs

For visual/browser checks use the existing external Playwright installation
without installing project dependencies:

    $env:CODE_UX_PLAYWRIGHT='<existing Playwright package.json path>'
    node tests/code-access/code-only-browser.mjs

Unavailable browser engines are explicitly reported, never counted as passing.
The harness tests Edge desktop and mobile viewport/touch emulation, HTTP cookie
attributes, storage-state restoration, and a real persistent Edge process restart.
It does not prove iOS Safari/Chrome, Android Chrome or device reboot behavior.

Before enabling in production, verify a plan's public price/duration/contact,
guest and account activation, protected content and Telegram linking. Confirm
old orders can still be read/contacted/submitted/reviewed with new sales closed.
External WhatsApp opens a prepared message; the student must send it.

Rollback: restore PAYMENT_V1_ENABLED=true with the existing approved launch list.
Review/code flags and all historical orders, ledger, grants and entitlements
remain intact. No reverse migration or data restoration is required.

Deferred: guest-to-account claim, stricter device policy, automated payment
provider/checkout and code-sale financial reconciliation. Code issuance audit
is not proof of payment; retain external payment/refund evidence and reference
it in the audited issuance reason/internal records.

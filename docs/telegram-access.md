# Telegram paid-subject access

Telegram access is an optional delivery channel for paid subjects. The database remains the source of truth for eligibility. Telegram membership never creates or extends an entitlement or code grant.

## Runtime configuration

All values are server-only:

- `TELEGRAM_ACCESS_ENABLED`: global release control. Keep `false` until rollout approval.
- `TELEGRAM_BOT_TOKEN`: token issued by BotFather.
- `TELEGRAM_BOT_USERNAME`: bot username without a required `@` prefix.
- `TELEGRAM_WEBHOOK_SECRET`: URL-safe random secret, at least 32 characters.
- `TELEGRAM_SYNC_SECRET`: separate URL-safe random secret, at least 32 characters.
- `TELEGRAM_EXPIRY_MAX_DELAY_MINUTES`: integer from 1 to 15. This is the removal target, not a scheduler guarantee.
- `NEXTAUTH_URL`: the canonical root HTTPS origin used to construct the webhook URL.

Run `npm run telegram:preflight` in a production-shaped environment. It validates shape only and never prints secret values. A pass still requires the live checks below.

## BotFather and private channel

1. Create a dedicated bot with BotFather, record its token, and set a username.
2. Keep the subject channel private. Public usernames are rejected.
3. From the admin Telegram tab, issue a one-time admin identity link and open the bot.
4. Add the bot separately to the intended private channel as an administrator.
5. Grant only the permissions required to create invite links and restrict/remove members.
6. Return to the admin tab, run the on-demand health check, then enable new linking.

The admin identity deep-link and adding the bot to a channel are separate operations. Only one pending admin connect request per admin is supported. Rebinding preserves channel, membership, job, and audit history and is blocked until memberships and outstanding jobs are settled.

## Webhook registration

After the deployment is ready and the feature remains closed, call Telegram `setWebhook` from a trusted operator environment:

- URL: `https://mustawak.com/api/v1/integrations/telegram/webhook`
- `secret_token`: the exact `TELEGRAM_WEBHOOK_SECRET` value
- Allowed update types: `my_chat_member`, `chat_join_request`, and `message`

Verify with Telegram `getWebhookInfo`. Do not put the bot token or webhook secret in logs, tickets, URLs, or this repository.

## Scheduler

The scheduler calls `POST /api/v1/integrations/telegram/sync` with:

```text
Authorization: Bearer <TELEGRAM_SYNC_SECRET>
```

Use a scheduler whose documented cadence is no greater than the configured expiry window. The initial production target is every 5 minutes, leaving room for one delayed run while remaining near the 15-minute maximum. The endpoint is idempotent, claims jobs with row locks, expires one-time links, retries transient failures, and sweeps due memberships. No scheduler is configured by this code change.

## Operational controls

- Normal admin and student page loads read database state only.
- Channel health verification is an explicit admin action and calls Telegram on demand.
- Disabling a channel blocks new links but preserves existing memberships.
- Mass removal requires a disabled channel, a reason, and explicit confirmation. It creates one retryable outbox job per membership; it does not call Telegram in the HTTP request.
- Disconnect is blocked while memberships or outstanding jobs remain and never deletes history.
- Grant or entitlement revocation queues reconciliation. Disabling a code alone does not remove Telegram membership.

## Real Telegram UAT

1. Keep `TELEGRAM_ACCESS_ENABLED=false`; deploy schema and application, then run the closed-state smoke test.
2. Configure the secrets, register the webhook, configure the scheduler, and verify both externally while still closed.
3. Enable the global control and connect one private channel to one test subject. Keep channel linking disabled.
4. Run on-demand health verification and confirm invite/restrict permissions.
5. Enable linking for that channel only.
6. Test an account with active subject access: issue link, start bot, request join, verify approval and active membership.
7. Test a guest grant separately and verify it remains bound to that exact grant.
8. Confirm replayed/expired links fail, unknown join requests are declined, and no raw link token appears in logs or admin UI.
9. Revoke one access source while another account source remains and confirm membership stays active.
10. Revoke the final source and verify removal within the scheduler target.
11. Disable the channel and verify new links stop while existing membership remains.
12. Queue mass removal in the danger zone, observe outbox retries, and disconnect only after all memberships and jobs settle.

# Messaging: incoming + email — design notes

Design-notes only. Nothing here is implemented. This file is a punch list
for the app owner to make decisions on before any code is written; it is
not linked from or rendered by the app.

Source: `needed.md` item 11 — "we need to discuss about incoming — how we
shall use that feature, also we need to add messaging using email too."

## What exists today

- `App\Models\Message` + `MessageRecipient` pivot: in-app only, no email
  sending or receiving anywhere in the codebase (`app/Mail` doesn't exist).
- Two message types: `personal` (one recipient) and `broadcast` (many
  recipients via role or "everyone"). Both are User → User(s) only.
- No Tenant messaging — deferred by an earlier product decision until the
  Tenant entity exists (see landlord hierarchy roadmap). Any email design
  below should stay consistent with that: User-only for now, but not
  architecturally closed off from Tenants later.
- Read receipts exist (`MessageRecipient.read_at`) but only for in-app
  viewing; no delivery/open tracking for any external channel.
- `App\Notifications\RentDueSoon` / `RentOverdue` already implement a
  working, configurable `mail` channel (per-notifiable `$channels` array
  including `'mail'`) — this is the one piece of "email" infrastructure
  that already works today, and is unrelated to the `Message` model.

## Outbound email — options

**A. Mailable per Message (simplest, most direct)**
- Add a `SendMessageMail` Mailable, dispatched from `MessageController@store`
  (or a queued job/listener on message creation) for each recipient who has
  email delivery enabled.
- Integration point: add a `channel` enum column to `messages` (`in_app`,
  `email`, `both`) or, more flexibly, a `notify_by_email` boolean on the
  sender's choice per-send, plus a per-user preference (e.g.
  `users.email_notifications_enabled`) so recipients can opt out.
- Delivery tracking: extend `MessageRecipient` with `emailed_at` (mirrors
  `read_at`), or add a separate `message_deliveries` log table if we want
  provider-level status (sent/bounced/opened) later.
- Uses Laravel's built-in `Mail` facade + whatever `MAIL_MAILER` is already
  configured (`.env`) — no new vendor dependency required for this option.

**B. Route Message creation through Laravel Notifications instead of a
custom Mailable**
- Turn "you have a new message" into a `Notification` (like `RentDueSoon`)
  with a `toMail()` method, dispatched to the recipient `User` alongside
  the existing in-app `Message` row. Reuses the exact pattern already
  proven in this codebase (`app/Notifications/RentDueSoon.php`,
  `RentOverdue.php`), including their existing `$channels` opt-in/opt-out
  convention.
- Smaller lift than (A) since it's copy-paste from an existing, working
  pattern rather than new Mailable/queue plumbing — but conflates
  "message" with "notification," which are currently separate concepts in
  this codebase (`Message` model vs. the notifications table). Needs a
  decision on whether that conflation is acceptable.

**C. Transactional email provider (Postmark/SendGrid/Mailgun/SES) via
Laravel's mailer driver**
- Same as (A) or (B) code-wise — Laravel abstracts the provider behind the
  `Mail` facade — but swaps `MAIL_MAILER` to a provider driver for
  deliverability, bounce webhooks, and analytics instead of raw SMTP.
- Only matters once volume/deliverability becomes a concern; doesn't
  change the `Message`/`MessageRecipient` schema question above.

Recommendation for whichever option is picked: add the `channel` /
delivery-log piece regardless, since "did this actually get emailed" is a
separate question from "was it read in-app" and the existing `read_at`
column can't answer it.

## Incoming messages — options

**A. "Incoming" just means email notifications of new in-app messages
(no true inbound email)**
- Smallest, already-tractable scope: reuse the `mail` channel pattern from
  `RentDueSoon`/`RentOverdue` (option B above) so a User gets emailed when
  someone sends them an in-app `Message`. No inbound parsing, no new
  attack surface, no provider webhook needed.
- This is very likely the intended reading of "incoming" given "no Tenant
  messaging yet" — flag this as the recommended default interpretation to
  confirm with the app owner before building anything bigger.

**B. Inbound email webhook (Postmark/SendGrid/Mailgun inbound parse)**
- Provider receives email at a configured address/domain, POSTs parsed
  sender + subject + body to an app webhook endpoint, which creates a new
  `Message` row: sender resolved by matching the `From` address to a
  `User` (and later `Tenant`) email, recipient(s) resolved via a
  reply-to/thread token or a fixed "support inbox" pattern (see next
  option). Requires a public unauthenticated (but signature-verified)
  endpoint, spam filtering, and a policy for unmatched senders.
- Needs: provider account + inbound domain/DNS setup (MX records), a
  `IncomingMessageWebhookController`, signature verification middleware,
  and a decision on threading (does a reply-by-email attach to the
  original `Message` or start a new one?).

**C. IMAP polling of a shared mailbox**
- A scheduled job polls a mailbox (e.g. via `webklex/laravel-imap` or
  similar) instead of a webhook. Avoids DNS/webhook setup but adds polling
  latency and an extra scheduled-job dependency; generally a fallback when
  webhook-based inbound isn't available from the chosen provider or infra
  team won't open a public endpoint.

Options B and C are a materially larger feature than anything else in the
messaging module today (new inbound identity-matching logic, spam/security
handling, threading model) and should not be started without the app
owner picking a specific option first.

## Open questions for the app owner

1. Does "incoming" mean (A) email-notify-on-new-in-app-message, or true
   inbound email creating new in-app messages (B/C)? These are very
   different sizes of work.
2. If true inbound email: which provider, and is there budget/infra
   approval for a transactional email account + inbound domain?
3. Should Tenants be included once this ships, given messaging is
   currently User-only by earlier decision — or does email messaging stay
   User-only too until the Tenant entity exists?
4. Webhook vs. polling (if B/C) — does infra allow a public inbound
   webhook endpoint, or is IMAP polling required?
5. Spam/security handling for inbound: sender allowlisting (only known
   User/Tenant emails), rate limiting, attachment handling/size limits,
   virus scanning?
6. Threading model: does an email reply attach to the original `Message`
   thread, or always create a new one?
7. For outbound (A/B/C above): opt-in or opt-out by default per user, and
   does a "both channels" send need a unified delivery-status view, or is
   in-app `read_at` and email delivery tracked/reported separately?
